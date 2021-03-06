package chisel

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/dchest/uniuri"
	chserver "github.com/jpillora/chisel/server"
	cmap "github.com/orcaman/concurrent-map"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/bolt/errors"
)

const (
	tunnelCleanupInterval = 10 * time.Second
	requiredTimeout       = 15 * time.Second
	activeTimeout         = 4*time.Minute + 30*time.Second
)

// Service represents a service to manage the state of multiple reverse tunnels.
// It is used to start a reverse tunnel server and to manage the connection status of each tunnel
// connected to the tunnel server.
type Service struct {
	serverFingerprint string
	serverPort        string
	tunnelDetailsMap  cmap.ConcurrentMap
	dataStore         portainer.DataStore
	snapshotService   portainer.SnapshotService
	chiselServer      *chserver.Server
	shutdownCtx       context.Context
}

// NewService returns a pointer to a new instance of Service
func NewService(dataStore portainer.DataStore, shutdownCtx context.Context) *Service {
	return &Service{
		tunnelDetailsMap: cmap.New(),
		dataStore:        dataStore,
		shutdownCtx:      shutdownCtx,
	}
}

// StartTunnelServer starts a tunnel server on the specified addr and port.
// It uses a seed to generate a new private/public key pair. If the seed cannot
// be found inside the database, it will generate a new one randomly and persist it.
// It starts the tunnel status verification process in the background.
// The snapshotter is used in the tunnel status verification process.
func (service *Service) StartTunnelServer(addr, port string, snapshotService portainer.SnapshotService) error {
	keySeed, err := service.retrievePrivateKeySeed()
	if err != nil {
		return err
	}

	config := &chserver.Config{
		Reverse: true,
		KeySeed: keySeed,
	}

	chiselServer, err := chserver.NewServer(config)
	if err != nil {
		return err
	}

	service.serverFingerprint = chiselServer.GetFingerprint()
	service.serverPort = port

	err = chiselServer.Start(addr, port)
	if err != nil {
		return err
	}
	service.chiselServer = chiselServer

	// TODO: work-around Chisel default behavior.
	// By default, Chisel will allow anyone to connect if no user exists.
	username, password := generateRandomCredentials()
	err = service.chiselServer.AddUser(username, password, "127.0.0.1")
	if err != nil {
		return err
	}

	service.snapshotService = snapshotService
	go service.startTunnelVerificationLoop()

	return nil
}

// StopTunnelServer stops tunnel http server
func (service *Service) StopTunnelServer() error {
	return service.chiselServer.Close()
}

func (service *Service) retrievePrivateKeySeed() (string, error) {
	var serverInfo *portainer.TunnelServerInfo

	serverInfo, err := service.dataStore.TunnelServer().Info()
	if err == errors.ErrObjectNotFound {
		keySeed := uniuri.NewLen(16)

		serverInfo = &portainer.TunnelServerInfo{
			PrivateKeySeed: keySeed,
		}

		err := service.dataStore.TunnelServer().UpdateInfo(serverInfo)
		if err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	}

	return serverInfo.PrivateKeySeed, nil
}

func (service *Service) startTunnelVerificationLoop() {
	log.Printf("[DEBUG] [chisel, monitoring] [check_interval_seconds: %f] [message: starting tunnel management process]", tunnelCleanupInterval.Seconds())
	ticker := time.NewTicker(tunnelCleanupInterval)

	for {
		select {
		case <-ticker.C:
			service.checkTunnels()
		case <-service.shutdownCtx.Done():
			log.Println("[DEBUG] Shutting down tunnel service")
			if err := service.StopTunnelServer(); err != nil {
				log.Printf("Stopped tunnel service: %s", err)
			}
			ticker.Stop()
			return
		}
	}
}

func (service *Service) checkTunnels() {
	for item := range service.tunnelDetailsMap.IterBuffered() {
		tunnel := item.Val.(*portainer.TunnelDetails)

		if tunnel.LastActivity.IsZero() || tunnel.Status == portainer.EdgeAgentIdle {
			continue
		}

		elapsed := time.Since(tunnel.LastActivity)
		log.Printf("[DEBUG] [chisel,monitoring] [endpoint_id: %s] [status: %s] [status_time_seconds: %f] [message: endpoint tunnel monitoring]", item.Key, tunnel.Status, elapsed.Seconds())

		if tunnel.Status == portainer.EdgeAgentManagementRequired && elapsed.Seconds() < requiredTimeout.Seconds() {
			continue
		} else if tunnel.Status == portainer.EdgeAgentManagementRequired && elapsed.Seconds() > requiredTimeout.Seconds() {
			log.Printf("[DEBUG] [chisel,monitoring] [endpoint_id: %s] [status: %s] [status_time_seconds: %f] [timeout_seconds: %f] [message: REQUIRED state timeout exceeded]", item.Key, tunnel.Status, elapsed.Seconds(), requiredTimeout.Seconds())
		}

		if tunnel.Status == portainer.EdgeAgentActive && elapsed.Seconds() < activeTimeout.Seconds() {
			continue
		} else if tunnel.Status == portainer.EdgeAgentActive && elapsed.Seconds() > activeTimeout.Seconds() {
			log.Printf("[DEBUG] [chisel,monitoring] [endpoint_id: %s] [status: %s] [status_time_seconds: %f] [timeout_seconds: %f] [message: ACTIVE state timeout exceeded]", item.Key, tunnel.Status, elapsed.Seconds(), activeTimeout.Seconds())

			endpointID, err := strconv.Atoi(item.Key)
			if err != nil {
				log.Printf("[ERROR] [chisel,snapshot,conversion] Invalid endpoint identifier (id: %s): %s", item.Key, err)
			}

			err = service.snapshotEnvironment(portainer.EndpointID(endpointID), tunnel.Port)
			if err != nil {
				log.Printf("[ERROR] [snapshot] Unable to snapshot Edge endpoint (id: %s): %s", item.Key, err)
			}
		}

		if len(tunnel.Jobs) > 0 {
			endpointID, err := strconv.Atoi(item.Key)
			if err != nil {
				log.Printf("[ERROR] [chisel,conversion] Invalid endpoint identifier (id: %s): %s", item.Key, err)
				continue
			}

			service.SetTunnelStatusToIdle(portainer.EndpointID(endpointID))
		} else {
			service.tunnelDetailsMap.Remove(item.Key)
		}

	}
}

func (service *Service) snapshotEnvironment(endpointID portainer.EndpointID, tunnelPort int) error {
	endpoint, err := service.dataStore.Endpoint().Endpoint(endpointID)
	if err != nil {
		return err
	}

	endpointURL := endpoint.URL

	endpoint.URL = fmt.Sprintf("tcp://127.0.0.1:%d", tunnelPort)
	err = service.snapshotService.SnapshotEndpoint(endpoint)
	if err != nil {
		return err
	}

	endpoint.URL = endpointURL
	return service.dataStore.Endpoint().UpdateEndpoint(endpoint.ID, endpoint)
}

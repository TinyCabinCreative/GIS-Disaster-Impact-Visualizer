const WebSocket = require('ws');
const logger = require('../utils/logger');

/**
 * WebSocket Service for real-time disaster updates
 */

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info(`WebSocket client connected from ${clientIp}`);
      
      this.clients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Disaster Impact Visualizer',
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('WebSocket client disconnected');
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle incoming messages from clients
   */
  handleMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Client wants to subscribe to specific disaster types
        ws.subscriptions = data.disasterTypes || [];
        ws.send(JSON.stringify({
          type: 'subscribed',
          disasterTypes: ws.subscriptions
        }));
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;

      default:
        logger.warn('Unknown message type:', data.type);
    }
  }

  /**
   * Broadcast new disaster to all clients
   */
  broadcastNewDisaster(disaster) {
    const message = JSON.stringify({
      type: 'new_disaster',
      data: disaster,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message, (ws) => {
      // Only send if client subscribed to this type or has no subscriptions
      return !ws.subscriptions || 
             ws.subscriptions.length === 0 || 
             ws.subscriptions.includes(disaster.type);
    });
  }

  /**
   * Broadcast disaster update to all clients
   */
  broadcastDisasterUpdate(disaster) {
    const message = JSON.stringify({
      type: 'disaster_update',
      data: disaster,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message, (ws) => {
      return !ws.subscriptions || 
             ws.subscriptions.length === 0 || 
             ws.subscriptions.includes(disaster.type);
    });
  }

  /**
   * Broadcast alert to all clients
   */
  broadcastAlert(alert) {
    const message = JSON.stringify({
      type: 'alert',
      data: alert,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  /**
   * Broadcast impact assessment to all clients
   */
  broadcastImpactAssessment(disasterId, assessment) {
    const message = JSON.stringify({
      type: 'impact_assessment',
      disasterId,
      data: assessment,
      timestamp: new Date().toISOString()
    });

    this.broadcast(message);
  }

  /**
   * Generic broadcast function
   */
  broadcast(message, filter = null) {
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (!filter || filter(client)) {
          client.send(message);
          sentCount++;
        }
      }
    });

    logger.debug(`Broadcast message to ${sentCount} clients`);
  }

  /**
   * Get connected client count
   */
  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new WebSocketService();
#!/usr/bin/env node

/**
 * Test script to verify WebSocket real-time communication improvements
 * This tests the enhanced connection recovery and message delivery reliability
 */

const WebSocket = require('ws');

// Configuration
const WORKERS_WS_URL =
  'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';
const TEST_URL = 'https://twitter.com/elonmusk/status/1234567890';

class WebSocketTester {
  constructor() {
    this.ws = null;
    this.connectionId = `test_${Date.now()}`;
    this.messageCount = 0;
    this.startTime = Date.now();
    this.testResults = {
      connectionEstablished: false,
      messagesSent: 0,
      messagesReceived: 0,
      progressUpdatesReceived: 0,
      errorsReceived: 0,
      connectionRecoveryTested: false,
      averageLatency: 0,
      testDuration: 0,
    };
  }

  async runTests() {
    console.log('🧪 Starting WebSocket Real-time Communication Tests');
    console.log('='.repeat(60));

    try {
      // Test 1: Basic Connection
      await this.testBasicConnection();

      // Test 2: Message Delivery
      await this.testMessageDelivery();

      // Test 3: Progress Updates
      await this.testProgressUpdates();

      // Test 4: Connection Recovery
      await this.testConnectionRecovery();

      // Test 5: Error Handling
      await this.testErrorHandling();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testBasicConnection() {
    console.log('\n📡 Test 1: Basic WebSocket Connection');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WORKERS_WS_URL);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connection established');
        this.testResults.connectionEstablished = true;

        // Set up message handler
        this.ws.on('message', data => {
          this.handleMessage(JSON.parse(data.toString()));
        });

        resolve();
      });

      this.ws.on('error', error => {
        clearTimeout(timeout);
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });
    });
  }

  async testMessageDelivery() {
    console.log('\n📤 Test 2: Message Delivery Reliability');

    // Send ping messages to test delivery
    for (let i = 0; i < 5; i++) {
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now(),
        testId: `ping_${i}`,
        connectionId: this.connectionId,
      };

      this.ws.send(JSON.stringify(pingMessage));
      this.testResults.messagesSent++;
      console.log(`📤 Sent ping ${i + 1}/5`);

      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`✅ Message delivery test completed`);
  }

  async testProgressUpdates() {
    console.log('\n📊 Test 3: Progress Update Simulation');

    // Start a test conversion to receive progress updates
    const conversionRequest = {
      type: 'start_conversion',
      payload: {
        url: TEST_URL,
        format: 'mp3',
        quality: 'high',
        platform: 'twitter',
      },
    };

    this.ws.send(JSON.stringify(conversionRequest));
    this.testResults.messagesSent++;
    console.log('📤 Sent conversion request');

    // Wait for progress updates
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(
      `✅ Progress updates test completed (${this.testResults.progressUpdatesReceived} updates received)`
    );
  }

  async testConnectionRecovery() {
    console.log('\n🔄 Test 4: Connection Recovery');

    // Simulate connection issues by sending malformed data
    try {
      this.ws.send('invalid json data');
      console.log('📤 Sent malformed data to test error handling');
    } catch (error) {
      console.log('⚠️ Expected error sending malformed data:', error.message);
    }

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test if connection is still working
    const testMessage = {
      type: 'ping',
      timestamp: Date.now(),
      testId: 'recovery_test',
    };

    this.ws.send(JSON.stringify(testMessage));
    this.testResults.messagesSent++;
    console.log('📤 Sent recovery test message');

    await new Promise(resolve => setTimeout(resolve, 1000));
    this.testResults.connectionRecoveryTested = true;
    console.log('✅ Connection recovery test completed');
  }

  async testErrorHandling() {
    console.log('\n❌ Test 5: Error Handling');

    // Test invalid conversion request
    const invalidRequest = {
      type: 'start_conversion',
      payload: {
        url: 'invalid-url',
        format: 'invalid-format',
        quality: 'invalid-quality',
      },
    };

    this.ws.send(JSON.stringify(invalidRequest));
    this.testResults.messagesSent++;
    console.log('📤 Sent invalid conversion request');

    // Wait for error response
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Error handling test completed');
  }

  handleMessage(message) {
    this.testResults.messagesReceived++;
    const { type, payload } = message;

    console.log(
      `📨 Received: ${type}${payload ? ` (${Object.keys(payload).join(', ')})` : ''}`
    );

    switch (type) {
      case 'pong':
        // Calculate latency
        if (payload && payload.clientTimestamp) {
          const latency = Date.now() - payload.clientTimestamp;
          this.testResults.averageLatency =
            (this.testResults.averageLatency + latency) / 2;
          console.log(`   ⏱️ Latency: ${latency}ms`);
        }
        break;

      case 'progress_update':
        this.testResults.progressUpdatesReceived++;
        if (payload) {
          console.log(
            `   📊 Progress: ${payload.progress}% (${payload.status})`
          );
        }
        break;

      case 'conversion_error':
      case 'error':
        this.testResults.errorsReceived++;
        console.log(
          `   ❌ Error: ${payload?.error || payload?.message || 'Unknown error'}`
        );
        break;

      case 'recovery_attempt':
        console.log(
          `   🔄 Recovery: ${payload?.message || 'Recovery attempt'}`
        );
        break;

      case 'connection_recovery':
        console.log(
          `   🔄 Connection Recovery: ${payload?.message || 'Connection recovery suggested'}`
        );
        break;
    }
  }

  printResults() {
    this.testResults.testDuration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 WebSocket Test Results');
    console.log('='.repeat(60));

    console.log(
      `✅ Connection Established: ${this.testResults.connectionEstablished ? 'YES' : 'NO'}`
    );
    console.log(`📤 Messages Sent: ${this.testResults.messagesSent}`);
    console.log(`📨 Messages Received: ${this.testResults.messagesReceived}`);
    console.log(
      `📊 Progress Updates: ${this.testResults.progressUpdatesReceived}`
    );
    console.log(`❌ Errors Received: ${this.testResults.errorsReceived}`);
    console.log(
      `🔄 Recovery Tested: ${this.testResults.connectionRecoveryTested ? 'YES' : 'NO'}`
    );
    console.log(
      `⏱️ Average Latency: ${Math.round(this.testResults.averageLatency)}ms`
    );
    console.log(
      `⏰ Test Duration: ${Math.round(this.testResults.testDuration / 1000)}s`
    );

    // Calculate success rate
    const successRate =
      (this.testResults.messagesReceived / this.testResults.messagesSent) * 100;
    console.log(`📈 Message Success Rate: ${Math.round(successRate)}%`);

    // Overall assessment
    const isHealthy =
      this.testResults.connectionEstablished &&
      successRate > 80 &&
      this.testResults.averageLatency < 5000;

    console.log('\n' + '='.repeat(60));
    console.log(
      `🏥 Overall Health: ${isHealthy ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`
    );

    if (!isHealthy) {
      console.log('\n🔧 Recommendations:');
      if (!this.testResults.connectionEstablished) {
        console.log('   - Check WebSocket server availability');
      }
      if (successRate <= 80) {
        console.log('   - Investigate message delivery issues');
      }
      if (this.testResults.averageLatency >= 5000) {
        console.log('   - Check network latency and server performance');
      }
    }

    console.log('='.repeat(60));
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Run the tests
async function main() {
  const tester = new WebSocketTester();

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    tester.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Test terminated');
    tester.cleanup();
    process.exit(0);
  });

  try {
    await tester.runTests();
    tester.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    tester.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WebSocketTester;

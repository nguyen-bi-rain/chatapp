import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat App API',
      version: '1.0.0',
      description: 'A real-time chat application API with Socket.IO integration',
      contact: {
        name: 'Chat App Support',
        email: 'support@chatapp.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'username'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user'
            },
            username: {
              type: 'string',
              description: 'Username for the user'
            },
            room: {
              type: 'string',
              description: 'Current room the user is in',
              nullable: true
            }
          }
        },
        Message: {
          type: 'object',
          required: ['id', 'username', 'message', 'timestamp'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the message'
            },
            username: {
              type: 'string',
              description: 'Username of the message sender'
            },
            message: {
              type: 'string',
              description: 'The message content'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the message was sent'
            },
            room: {
              type: 'string',
              description: 'Room where the message was sent',
              nullable: true
            }
          }
        },
        JoinData: {
          type: 'object',
          required: ['username'],
          properties: {
            username: {
              type: 'string',
              description: 'Username to join with'
            },
            room: {
              type: 'string',
              description: 'Room to join',
              nullable: true
            }
          }
        },
        MessageData: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'The message to send'
            },
            room: {
              type: 'string',
              description: 'Room to send message to',
              nullable: true
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        WelcomeResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Chat App Server is running!'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error description'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Socket.IO Events',
        description: 'Real-time communication events (not REST endpoints)'
      }
    ]
  },
  apis: ['./src/**/*.ts'], // Path to the API files
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Chat App API Documentation'
  }));

  // JSON endpoint for the swagger specification
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at: http://localhost:3001/api-docs');
};

export { specs };

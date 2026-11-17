const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test Case Management API',
      version: '1.0.0',
      description:
        'REST API for managing test projects, cases, suites, executions, and analytics with RBAC.',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Users' },
      { name: 'Projects' },
      { name: 'Test Cases' },
      { name: 'Suites' },
      { name: 'Executions' },
      { name: 'Analytics' },
    ],
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'JWT + user' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          security: [],
          summary: 'Register new user (defaults to tester)',
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/projects': {
        get: { tags: ['Projects'], summary: 'List projects', responses: { 200: { description: 'OK' } } },
        post: {
          tags: ['Projects'],
          summary: 'Create project (admin, test-lead)',
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/testcases': {
        get: {
          tags: ['Test Cases'],
          summary: 'List/search/filter test cases (all roles)',
          parameters: [
            { name: 'projectId', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'priority', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Paginated list' } },
        },
        post: {
          tags: ['Test Cases'],
          summary: 'Create test case (admin, test-lead)',
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/testexecutions': {
        post: {
          tags: ['Executions'],
          summary: 'Record execution (admin, test-lead, tester)',
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/analytics/dashboard': {
        get: {
          tags: ['Analytics'],
          summary: 'Dashboard metrics (all roles, cached 15m)',
          parameters: [
            { name: 'projectId', in: 'query', required: true, schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Analytics payload' } },
        },
      },
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'List users (admin only)',
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);

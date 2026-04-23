const endpointInputSchema = {
  type: 'object',
  required: ['name', 'protocol', 'host', 'port', 'hasResponse'],
  properties: {
    externalId: {
      type: 'string',
      format: 'uuid',
      description: 'Stable import identifier used during bulk upsert.',
    },
    name: {
      type: 'string',
      minLength: 1,
    },
    description: {
      type: 'string',
    },
    protocol: {
      type: 'string',
      enum: ['HTTP', 'TCP', 'UDP'],
    },
    host: {
      type: 'string',
      minLength: 1,
    },
    port: {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
    },
    httpMethod: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      description: 'Required when protocol is HTTP.',
    },
    path: {
      type: 'string',
      description: 'Required when protocol is HTTP.',
    },
    requestBody: {
      type: 'string',
      description: 'Sent as JSON for HTTP and raw text for TCP/UDP.',
    },
    hasResponse: {
      type: 'boolean',
      description: 'Whether the transmitter should wait for and capture a response.',
    },
    responseBody: {
      type: 'string',
      description: 'Expected response stored for UI-side comparison.',
    },
    group: {
      type: 'string',
    },
  },
  description: 'For HTTP endpoints, both httpMethod and path must be provided.',
  additionalProperties: false,
} as const;

const endpointSchema = {
  allOf: [
    endpointInputSchema,
    {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'integer',
          minimum: 1,
        },
      },
    },
  ],
} as const;

const transmitResultSchema = {
  type: 'object',
  required: ['success', 'latencyMs'],
  properties: {
    success: {
      type: 'boolean',
    },
    responseBody: {
      type: 'string',
    },
    error: {
      type: 'string',
    },
    latencyMs: {
      type: 'number',
      minimum: 0,
    },
  },
  additionalProperties: false,
} as const;

const errorSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'string',
    },
  },
  additionalProperties: false,
} as const;

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EndpointLab Backend API',
    version: '1.0.0',
    description: 'Express API for storing endpoint definitions and executing HTTP, TCP, and UDP transmissions.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Endpoints',
      description: 'Stored endpoint definitions',
    },
    {
      name: 'Transmit',
      description: 'Execute a saved endpoint',
    },
  ],
  components: {
    schemas: {
      EndpointInput: endpointInputSchema,
      Endpoint: endpointSchema,
      BulkUpsertResult: {
        type: 'object',
        required: ['created', 'updated'],
        properties: {
          created: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Endpoint',
            },
          },
          updated: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Endpoint',
            },
          },
        },
        additionalProperties: false,
      },
      TransmitResult: transmitResultSchema,
      ErrorResponse: errorSchema,
    },
    parameters: {
      EndpointId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Numeric endpoint identifier.',
        schema: {
          type: 'integer',
          minimum: 1,
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'The request payload or path parameter is invalid.',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      NotFound: {
        description: 'The requested endpoint or route does not exist.',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Unexpected backend failure.',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/endpoints': {
      get: {
        tags: ['Endpoints'],
        summary: 'List all endpoints',
        responses: {
          200: {
            description: 'Stored endpoints.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Endpoint',
                  },
                },
              },
            },
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
      post: {
        tags: ['Endpoints'],
        summary: 'Create one endpoint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EndpointInput',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created endpoint.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Endpoint',
                },
              },
            },
          },
          400: {
            $ref: '#/components/responses/BadRequest',
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/endpoints/bulk': {
      post: {
        tags: ['Endpoints'],
        summary: 'Bulk create or update endpoints',
        description: 'Rows with externalId update in place. Older imports fall back to name, protocol, host, port, method, and path.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/EndpointInput',
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Created and updated rows.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BulkUpsertResult',
                },
              },
            },
          },
          400: {
            $ref: '#/components/responses/BadRequest',
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/endpoints/{id}': {
      put: {
        tags: ['Endpoints'],
        summary: 'Update one endpoint',
        parameters: [
          {
            $ref: '#/components/parameters/EndpointId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EndpointInput',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated endpoint.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Endpoint',
                },
              },
            },
          },
          400: {
            $ref: '#/components/responses/BadRequest',
          },
          404: {
            $ref: '#/components/responses/NotFound',
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
      delete: {
        tags: ['Endpoints'],
        summary: 'Delete one endpoint',
        parameters: [
          {
            $ref: '#/components/parameters/EndpointId',
          },
        ],
        responses: {
          200: {
            description: 'Endpoint deleted.',
          },
          400: {
            $ref: '#/components/responses/BadRequest',
          },
          404: {
            $ref: '#/components/responses/NotFound',
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/endpoints/{id}/send': {
      post: {
        tags: ['Transmit'],
        summary: 'Transmit one saved endpoint',
        parameters: [
          {
            $ref: '#/components/parameters/EndpointId',
          },
        ],
        responses: {
          200: {
            description: 'Transmission result.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TransmitResult',
                },
              },
            },
          },
          400: {
            $ref: '#/components/responses/BadRequest',
          },
          404: {
            $ref: '#/components/responses/NotFound',
          },
          500: {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/openapi.json': {
      get: {
        tags: ['Endpoints'],
        summary: 'Get the OpenAPI document',
        responses: {
          200: {
            description: 'OpenAPI specification for this backend.',
          },
        },
      },
    },
  },
} as const;

export default openApiSpec;

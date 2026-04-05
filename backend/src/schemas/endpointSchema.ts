import { z } from 'zod';

/******************************************************************************
                                Schemas
******************************************************************************/

export const ProtocolSchema = z.enum(['HTTP', 'TCP', 'UDP']);
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

export const EndpointSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    protocol: ProtocolSchema,
    host: z.string().min(1, 'Host is required'),
    port: z.number().int().min(1).max(65535),
    httpMethod: HttpMethodSchema.optional(),
    path: z.string().optional(),
    requestBody: z.string().optional(),
    hasResponse: z.boolean(),
    responseBody: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.protocol === 'HTTP') {
        return !!data.httpMethod && !!data.path;
      }
      return true;
    },
    {
      message: 'httpMethod and path are required for HTTP protocol',
      path: ['httpMethod'],
    },
  );

export const EndpointWithIdSchema = EndpointSchema.extend({
  id: z.number().int().positive(),
});

export type EndpointInput = z.infer<typeof EndpointSchema>;
export type IEndpoint = z.infer<typeof EndpointWithIdSchema>;

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestContextMiddleware } from '../../common/logging/request-context.middleware';
import {
  preparePostgresTestDatabase,
  truncatePostgresTables,
} from '../test-postgres';

type AuthResponseBody = {
  data?: {
    access_token?: string;
    user?: { id?: string };
  };
};

type GroupCreateBody = {
  data?: {
    id?: string;
  };
};

type EntityCreateBody = {
  data?: {
    id?: string;
    status?: string;
  };
};

type GraphqlResponseBody<TData> = {
  data?: TData | null;
  errors?: { message?: string; extensions?: { code?: string } }[];
};

describe('GraphQL (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'e2e-internal-api-key';
    process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-32-characters-long';
    await preparePostgresTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.enableShutdownHooks();
    app.use(json({ limit: '256kb' }));
    app.use(urlencoded({ extended: true, limit: '256kb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(requestContextMiddleware);
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await truncatePostgresTables(app.get(DataSource));
  });

  afterEach(async () => {
    await app?.close();
  });

  it('requires a JWT for protected GraphQL queries', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('X-API-Key', 'e2e-internal-api-key')
      .send({
        query: `
          query Applications($groupId: ID!) {
            applicationsConnection(groupId: $groupId) {
              nodes {
                id
              }
            }
          }
        `,
        variables: { groupId: '00000000-0000-4000-8000-000000000000' },
      })
      .expect(200);

    const body = res.body as GraphqlResponseBody<{
      applicationsConnection?: { nodes: { id: string }[] };
    }>;
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message).toContain(
      'Invalid or missing bearer token',
    );
  });

  it('returns application summaries through the GraphQL read API', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    const auth = await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'admin@graphql.test', password: 'password12' })
      .expect(201);
    const token = (auth.body as AuthResponseBody).data?.access_token ?? '';
    const adminUserId = (auth.body as AuthResponseBody).data?.user?.id ?? '';

    const missingApiKey = await request(http)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query Applications($groupId: ID!) {
            applicationsConnection(groupId: $groupId) {
              nodes {
                id
              }
            }
          }
        `,
        variables: { groupId: '00000000-0000-4000-8000-000000000000' },
      })
      .expect(200);
    const missingApiKeyBody = missingApiKey.body as GraphqlResponseBody<{
      applicationsConnection?: { nodes: { id: string }[] };
    }>;
    expect(missingApiKeyBody.data).toBeNull();
    expect(missingApiKeyBody.errors?.[0]?.message).toContain(
      'Missing X-API-Key header',
    );

    const introspection = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query RelaySpecIntrospection {
            nodeType: __type(name: "Node") {
              kind
              fields {
                name
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
            applicationSummaryType: __type(name: "ApplicationSummary") {
              interfaces {
                name
              }
            }
            applicationDetailType: __type(name: "ApplicationDetail") {
              interfaces {
                name
              }
            }
            pageInfoType: __type(name: "PageInfo") {
              fields {
                name
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
            __schema {
              queryType {
                fields {
                  name
                  type {
                    kind
                    name
                  }
                  args {
                    name
                    type {
                      kind
                      name
                      ofType {
                        kind
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      })
      .expect(200);

    const introspectionBody = introspection.body as GraphqlResponseBody<{
      nodeType?: {
        kind: string;
        fields: {
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType: { kind: string; name: string } | null;
          };
        }[];
      };
      applicationSummaryType?: { interfaces: { name: string }[] };
      applicationDetailType?: { interfaces: { name: string }[] };
      pageInfoType?: {
        fields: {
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType: { kind: string; name: string } | null;
          };
        }[];
      };
      __schema?: {
        queryType: {
          fields: {
            name: string;
            type: { kind: string; name: string | null };
            args: {
              name: string;
              type: {
                kind: string;
                name: string | null;
                ofType: { kind: string; name: string } | null;
              };
            }[];
          }[];
        };
      };
    }>;
    expect(introspectionBody.errors).toBeUndefined();
    expect(introspectionBody.data?.nodeType).toEqual({
      kind: 'INTERFACE',
      fields: [
        {
          name: 'id',
          type: {
            kind: 'NON_NULL',
            name: null,
            ofType: { kind: 'SCALAR', name: 'ID' },
          },
        },
      ],
    });
    expect(introspectionBody.data?.applicationSummaryType?.interfaces).toEqual(
      [],
    );
    expect(introspectionBody.data?.applicationDetailType?.interfaces).toEqual([
      { name: 'Node' },
    ]);
    expect(introspectionBody.data?.pageInfoType?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'hasNextPage',
          type: {
            kind: 'NON_NULL',
            name: null,
            ofType: { kind: 'SCALAR', name: 'Boolean' },
          },
        }),
        expect.objectContaining({
          name: 'hasPreviousPage',
          type: {
            kind: 'NON_NULL',
            name: null,
            ofType: { kind: 'SCALAR', name: 'Boolean' },
          },
        }),
        expect.objectContaining({
          name: 'startCursor',
          type: { kind: 'SCALAR', name: 'String', ofType: null },
        }),
        expect.objectContaining({
          name: 'endCursor',
          type: { kind: 'SCALAR', name: 'String', ofType: null },
        }),
      ]),
    );
    const nodeField = introspectionBody.data?.__schema?.queryType.fields.find(
      (field) => field.name === 'node',
    );
    expect(nodeField).toEqual(
      expect.objectContaining({
        name: 'node',
        type: { kind: 'INTERFACE', name: 'Node' },
        args: [
          {
            name: 'id',
            type: {
              kind: 'NON_NULL',
              name: null,
              ofType: { kind: 'SCALAR', name: 'ID' },
            },
          },
        ],
      }),
    );

    const group = await request(http)
      .post('/groups')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'GraphQL Space', adminUserIds: [adminUserId] })
      .expect(201);
    const groupId = (group.body as GroupCreateBody).data?.id ?? '';

    const createdTpl = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId, name: 'GraphQL Form' })
      .expect(201);
    const formDefinitionId =
      (createdTpl.body as EntityCreateBody).data?.id ?? '';

    await request(http)
      .post(`/form-definitions/${formDefinitionId}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fieldKey: 'title',
        label: 'Title',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);

    await request(http)
      .post(`/form-definitions/${formDefinitionId}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        groupId,
        name: 'GraphQL Flow',
        steps: [
          {
            stepOrder: 1,
            stepName: 'Review',
            assigneeUserId: adminUserId,
            canReturn: true,
          },
        ],
      })
      .expect(201);

    const createdApp = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId, values: { title: 'Relay application' } })
      .expect(201);
    const applicationId = (createdApp.body as EntityCreateBody).data?.id ?? '';

    const emptySliceRes = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query Applications($groupId: ID!) {
            applicationsConnection(groupId: $groupId, first: 0) {
              nodes {
                id
              }
              edges {
                cursor
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
              totalCount
            }
          }
        `,
        variables: { groupId },
      })
      .expect(200);
    const emptySliceBody = emptySliceRes.body as GraphqlResponseBody<{
      applicationsConnection?: {
        nodes: { id: string }[];
        edges: { cursor: string }[];
        pageInfo: {
          hasNextPage: boolean;
          hasPreviousPage: boolean;
          startCursor: string | null;
          endCursor: string | null;
        };
        totalCount: number;
      };
    }>;
    expect(emptySliceBody.errors).toBeUndefined();
    expect(emptySliceBody.data?.applicationsConnection).toEqual({
      nodes: [],
      edges: [],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 1,
    });

    const res = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query Applications($groupId: ID!) {
            applicationsConnection(groupId: $groupId, first: 1) {
              nodes {
                id
                databaseId
                groupId
                status
              }
              edges {
                cursor
                node {
                  databaseId
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
              totalCount
            }
          }
        `,
        variables: { groupId },
      })
      .expect(200);

    const body = res.body as GraphqlResponseBody<{
      applicationsConnection?: {
        nodes: {
          id: string;
          databaseId: string;
          groupId: string;
          status: string;
        }[];
        edges: { cursor: string; node: { databaseId: string } }[];
        pageInfo: {
          hasNextPage: boolean;
          hasPreviousPage: boolean;
          startCursor: string | null;
          endCursor: string | null;
        };
        totalCount: number;
      };
    }>;
    expect(body.errors).toBeUndefined();
    const connection = body.data?.applicationsConnection;
    expect(connection?.totalCount).toBe(1);
    expect(connection?.pageInfo.hasNextPage).toBe(false);
    expect(connection?.pageInfo.hasPreviousPage).toBe(false);
    expect(connection?.nodes[0]).toEqual(
      expect.objectContaining({
        databaseId: applicationId,
        groupId,
        status: 'draft',
      }),
    );
    const relayId = connection?.nodes[0]?.id ?? '';
    expect(relayId).not.toBe(applicationId);
    expect(connection?.edges[0]?.cursor).toBe(connection?.pageInfo.startCursor);
    expect(connection?.edges[0]?.node.databaseId).toBe(applicationId);

    const nodeRes = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query Node($id: ID!) {
            node(id: $id) {
              id
              __typename
              ... on ApplicationDetail {
                databaseId
                status
                values
              }
            }
          }
        `,
        variables: { id: relayId },
      })
      .expect(200);

    const nodeBody = nodeRes.body as GraphqlResponseBody<{
      node?: {
        id: string;
        __typename: string;
        databaseId?: string;
        status?: string;
        values?: Record<string, unknown>;
      } | null;
    }>;
    expect(nodeBody.errors).toBeUndefined();
    expect(nodeBody.data?.node).toEqual(
      expect.objectContaining({
        id: relayId,
        __typename: 'ApplicationDetail',
        databaseId: applicationId,
        status: 'draft',
        values: { title: 'Relay application' },
      }),
    );

    const relayCollectionsRes = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query RelayCollections($groupId: ID!) {
            groupsConnection(first: 1) {
              nodes {
                id
                databaseId
                name
              }
              totalCount
            }
            usersConnection(first: 1) {
              nodes {
                id
                databaseId
                email
              }
              totalCount
            }
            formDefinitionsConnection(groupId: $groupId, first: 1) {
              nodes {
                id
                databaseId
                name
                fields {
                  fieldKey
                }
              }
              totalCount
            }
            approvalFlowsConnection(groupId: $groupId, first: 1) {
              nodes {
                id
                databaseId
                name
                steps {
                  stepName
                }
              }
              totalCount
            }
          }
        `,
        variables: { groupId },
      })
      .expect(200);

    const relayCollectionsBody =
      relayCollectionsRes.body as GraphqlResponseBody<{
        groupsConnection?: {
          nodes: { id: string; databaseId: string; name: string }[];
          totalCount: number;
        };
        usersConnection?: {
          nodes: { id: string; databaseId: string; email: string }[];
          totalCount: number;
        };
        formDefinitionsConnection?: {
          nodes: {
            id: string;
            databaseId: string;
            name: string;
            fields: { fieldKey: string }[];
          }[];
          totalCount: number;
        };
        approvalFlowsConnection?: {
          nodes: {
            id: string;
            databaseId: string;
            name: string;
            steps: { stepName: string }[];
          }[];
          totalCount: number;
        };
      }>;
    expect(relayCollectionsBody.errors).toBeUndefined();
    const groupNode =
      relayCollectionsBody.data?.groupsConnection?.nodes[0] ?? null;
    expect(groupNode).toEqual(
      expect.objectContaining({
        databaseId: groupId,
        name: 'GraphQL Space',
      }),
    );
    expect(groupNode?.id).not.toBe(groupId);
    expect(relayCollectionsBody.data?.usersConnection?.nodes[0]).toEqual(
      expect.objectContaining({
        databaseId: adminUserId,
        email: 'admin@graphql.test',
      }),
    );
    expect(
      relayCollectionsBody.data?.formDefinitionsConnection?.nodes[0],
    ).toEqual(
      expect.objectContaining({
        databaseId: formDefinitionId,
        name: 'GraphQL Form',
        fields: [{ fieldKey: 'title' }],
      }),
    );
    expect(
      relayCollectionsBody.data?.approvalFlowsConnection?.nodes[0],
    ).toEqual(
      expect.objectContaining({
        name: 'GraphQL Flow',
        steps: [{ stepName: 'Review' }],
      }),
    );

    const groupNodeRes = await request(http)
      .post('/graphql')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query Node($id: ID!) {
            node(id: $id) {
              id
              __typename
              ... on Group {
                databaseId
                name
              }
            }
          }
        `,
        variables: { id: groupNode?.id },
      })
      .expect(200);

    const groupNodeBody = groupNodeRes.body as GraphqlResponseBody<{
      node?: {
        id: string;
        __typename: string;
        databaseId?: string;
        name?: string;
      } | null;
    }>;
    expect(groupNodeBody.errors).toBeUndefined();
    expect(groupNodeBody.data?.node).toEqual(
      expect.objectContaining({
        id: groupNode?.id,
        __typename: 'Group',
        databaseId: groupId,
        name: 'GraphQL Space',
      }),
    );
  });
});

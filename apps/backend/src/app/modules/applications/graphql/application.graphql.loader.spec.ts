import {
  APPLICATION_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import type { Application } from '../../../../models/entities/application.entity';
import type { ApplicationsService } from '../services/facades/applications.service';
import { ApplicationGraphqlLoader } from './application.graphql.loader';

const actor = (overrides: Partial<AuthUserPayload> = {}): AuthUserPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  tenantId: 'tenant-1',
  roles: ['tenant_user'],
  ...overrides,
});

const application = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    ...overrides,
  }) as Application;

describe('ApplicationGraphqlLoader', () => {
  let applications: {
    getCorrectionsForActor: jest.Mock;
    getCorrectionTargetsForActor: jest.Mock;
    getOneForActor: jest.Mock;
    listConnectionForActor: jest.Mock;
    listForActor: jest.Mock;
    toDetailForActor: jest.Mock;
    toSummary: jest.Mock;
  };
  let loader: ApplicationGraphqlLoader;

  beforeEach(() => {
    applications = {
      getCorrectionsForActor: jest.fn(),
      getCorrectionTargetsForActor: jest.fn(),
      getOneForActor: jest.fn(),
      listConnectionForActor: jest.fn(),
      listForActor: jest.fn(),
      toDetailForActor: jest.fn(),
      toSummary: jest.fn(),
    };
    loader = new ApplicationGraphqlLoader(
      applications as unknown as ApplicationsService,
    );
  });

  it('caches application lists per actor and group within a GraphQL request', async () => {
    const currentActor = actor();
    const row = application();
    const summary = {
      id: 'app-1',
      groupId: 'group-1',
      status: 'draft',
    };
    applications.listForActor.mockResolvedValue([row]);
    applications.toSummary.mockReturnValue(summary);
    const graphqlSummary = {
      ...summary,
      __typename: 'ApplicationSummary',
      databaseId: 'app-1',
      id: toRelayGlobalId(APPLICATION_RELAY_NODE_TYPE, 'app-1'),
    };

    await expect(
      Promise.all([
        loader.listApplications(currentActor, 'group-1'),
        loader.listApplications(currentActor, 'group-1'),
      ]),
    ).resolves.toEqual([[graphqlSummary], [graphqlSummary]]);

    expect(applications.listForActor).toHaveBeenCalledTimes(1);
    expect(applications.listForActor).toHaveBeenCalledWith(
      currentActor,
      'group-1',
    );
  });

  it('loads application detail through the existing facade and mapper', async () => {
    const currentActor = actor();
    const row = application();
    const detail = {
      id: 'app-1',
      groupId: 'group-1',
      status: 'draft',
      values: {},
    };
    applications.getOneForActor.mockResolvedValue(row);
    applications.toDetailForActor.mockResolvedValue(detail);

    await expect(loader.getApplication(currentActor, 'app-1')).resolves.toEqual(
      {
        ...detail,
        __typename: 'ApplicationDetail',
        databaseId: 'app-1',
        id: toRelayGlobalId(APPLICATION_RELAY_NODE_TYPE, 'app-1'),
      },
    );

    expect(applications.getOneForActor).toHaveBeenCalledWith(
      currentActor,
      'app-1',
    );
    expect(applications.toDetailForActor).toHaveBeenCalledWith(
      row,
      currentActor,
    );
  });

  it('loads application connections from database pages', async () => {
    const currentActor = actor();
    const row = application();
    const summary = {
      id: 'app-1',
      groupId: 'group-1',
      status: 'draft',
    };
    applications.listConnectionForActor.mockResolvedValue({
      nodes: [row],
      offset: 3,
      totalCount: 10,
    });
    applications.toSummary.mockReturnValue(summary);

    await expect(
      loader.listApplicationsConnection({
        actor: currentActor,
        after: 'YXJyYXljb25uZWN0aW9uOjI',
        first: 1,
        groupId: 'group-1',
      }),
    ).resolves.toMatchObject({
      nodes: [
        {
          ...summary,
          __typename: 'ApplicationSummary',
          databaseId: 'app-1',
          id: toRelayGlobalId(APPLICATION_RELAY_NODE_TYPE, 'app-1'),
        },
      ],
      totalCount: 10,
    });

    expect(applications.listConnectionForActor).toHaveBeenCalledWith(
      currentActor,
      'group-1',
      { offset: 3, limit: 1 },
    );
  });
});

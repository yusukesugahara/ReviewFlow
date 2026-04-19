import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../common/errors';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'count' | 'create'>
  >;
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws when email is already taken', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: 'h',
        role: 'user',
        createdAt: new Date(),
      });

      await expect(
        service.register({ email: 'a@b.com', password: 'password12' }),
      ).rejects.toMatchObject({ errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN });
    });

    it('first user becomes admin and receives token payload', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.count.mockResolvedValue(0);
      users.create.mockImplementation((email, hash, role = 'user') =>
        Promise.resolve({
          id: 'id-admin',
          email: email.toLowerCase(),
          passwordHash: hash,
          role,
          createdAt: new Date(),
        }),
      );

      const out = await service.register({
        email: 'First@Example.com',
        password: 'password12',
      });

      expect(users.create).toHaveBeenCalledWith(
        'First@Example.com',
        expect.any(String),
        'admin',
      );
      const [, passwordHash] = users.create.mock.calls[0];
      await expect(
        bcrypt.compare('password12', String(passwordHash)),
      ).resolves.toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'id-admin',
        email: 'first@example.com',
        role: 'admin',
      });
      expect(out.user).toEqual({
        id: 'id-admin',
        email: 'first@example.com',
        role: 'admin',
      });
      expect(out.access_token).toBe('signed-jwt');
    });

    it('second user gets role user', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.count.mockResolvedValue(1);
      users.create.mockResolvedValue({
        id: 'id-u2',
        email: 'u2@example.com',
        passwordHash: 'h',
        role: 'user',
        createdAt: new Date(),
      });

      await service.register({
        email: 'u2@example.com',
        password: 'password12',
      });

      expect(users.create).toHaveBeenCalledWith(
        'u2@example.com',
        expect.any(String),
        'user',
      );
    });
  });

  describe('login', () => {
    it('throws when user does not exist', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'password12' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('throws when password does not match', async () => {
      const hash = await bcrypt.hash('correct', 4);
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'user',
        createdAt: new Date(),
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'wrongpassword' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('returns tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('password12', 4);
      users.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'user',
        createdAt: new Date(),
      });

      const out = await service.login({
        email: 'a@b.com',
        password: 'password12',
      });

      expect(out.access_token).toBe('signed-jwt');
      expect(out.user).toEqual({
        id: 'u1',
        email: 'a@b.com',
        role: 'user',
      });
    });
  });
});

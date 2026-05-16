export default async () => {
  const t = {
    ['./controllers/auth/dto/auth.dto']: await import('./controllers/auth/dto/auth.dto'),
    ['./controllers/health/dto/health-response.dto']:
      await import('./controllers/health/dto/health-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./controllers/auth/dto/auth.dto'),
          {
            RegisterBodyDto: {},
            LoginBodyDto: {},
            RefreshBodyDto: {},
            AuthTokensDto: {},
            AuthenticatedUserDto: {},
            AuthSessionDto: {},
          },
        ],
        [import('./controllers/health/dto/health-response.dto'), { HealthResponseDto: {} }],
      ],
      controllers: [
        [
          import('./controllers/auth/auth.controller'),
          {
            AuthController: {
              register: { type: t['./controllers/auth/dto/auth.dto'].AuthSessionDto },
              login: { type: t['./controllers/auth/dto/auth.dto'].AuthSessionDto },
              refresh: { type: t['./controllers/auth/dto/auth.dto'].AuthTokensDto },
            },
          },
        ],
        [
          import('./controllers/health/health.controller'),
          {
            HealthController: {
              check: { type: t['./controllers/health/dto/health-response.dto'].HealthResponseDto },
            },
          },
        ],
      ],
    },
  };
};

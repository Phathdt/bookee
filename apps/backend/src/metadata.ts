export default async () => {
  const t = {
    ['./controllers/health/dto/health-response.dto']:
      await import('./controllers/health/dto/health-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [[import('./controllers/health/dto/health-response.dto'), { HealthResponseDto: {} }]],
      controllers: [
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

export default async () => {
  const t = {
    ['./modules/health/dto/health-response.dto']:
      await import('./modules/health/dto/health-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./modules/health/dto/health-response.dto'),
          { HealthResponseDto: { status: { required: true, type: () => String } } },
        ],
      ],
      controllers: [
        [
          import('./modules/health/health.controller'),
          {
            HealthController: {
              check: { type: t['./modules/health/dto/health-response.dto'].HealthResponseDto },
            },
          },
        ],
      ],
    },
  };
};

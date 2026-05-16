export default async () => {
  const t = {
    ['./health/dto/health-response.dto']: await import('./health/dto/health-response.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./health/dto/health-response.dto'),
          { HealthResponseDto: { status: { required: true, type: () => String } } },
        ],
      ],
      controllers: [
        [
          import('./health/health.controller'),
          {
            HealthController: {
              check: { type: t['./health/dto/health-response.dto'].HealthResponseDto },
            },
          },
        ],
      ],
    },
  };
};

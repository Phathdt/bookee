/* eslint-disable */
export default async () => {
  const t = {
    ['./controllers/auth/dto/auth.dto']: await import('./controllers/auth/dto/auth.dto'),
    ['./controllers/health/dto/health-response.dto']:
      await import('./controllers/health/dto/health-response.dto'),
    ['./controllers/operators/dto/operators.dto']:
      await import('./controllers/operators/dto/operators.dto'),
    ['./controllers/routes/dto/routes.dto']: await import('./controllers/routes/dto/routes.dto'),
    ['./controllers/seat-layouts/dto/seat-layouts.dto']:
      await import('./controllers/seat-layouts/dto/seat-layouts.dto'),
    ['./controllers/stations/dto/stations.dto']:
      await import('./controllers/stations/dto/stations.dto'),
    ['./controllers/users/dto/users.dto']: await import('./controllers/users/dto/users.dto'),
    ['./controllers/trips/dto/trips.dto']: await import('./controllers/trips/dto/trips.dto'),
    ['./controllers/vehicles/dto/vehicles.dto']:
      await import('./controllers/vehicles/dto/vehicles.dto'),
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
        [
          import('./controllers/operators/dto/operators.dto'),
          {
            OperatorDto: {},
            CreateOperatorBodyDto: {},
            UpdateOperatorBodyDto: {},
            SetOperatorStatusBodyDto: {},
            AssignStaffBodyDto: {},
            PublicStaffUserDto: {},
          },
        ],
        [
          import('./controllers/routes/dto/routes.dto'),
          { RouteDto: {}, CreateRouteBodyDto: {}, UpdateRouteBodyDto: {}, RouteSearchQueryDto: {} },
        ],
        [
          import('./controllers/seat-layouts/dto/seat-layouts.dto'),
          {
            SeatDto: {},
            SeatLayoutDto: {},
            CreateSeatLayoutBodyDto: {},
            UpdateSeatLayoutBodyDto: {},
          },
        ],
        [
          import('./controllers/stations/dto/stations.dto'),
          {
            StationDto: {},
            CreateStationBodyDto: {},
            UpdateStationBodyDto: {},
            StationSearchQueryDto: {},
          },
        ],
        [
          import('./controllers/users/dto/users.dto'),
          { UpdateProfileBodyDto: {}, PublicUserDto: {} },
        ],
        [
          import('./controllers/trips/dto/trips.dto'),
          {
            TripDto: {},
            CreateTripBodyDto: {},
            BulkCreateTripsBodyDto: {},
            SetTripStatusBodyDto: {},
            TripSearchQueryDto: {},
          },
        ],
        [
          import('./controllers/vehicles/dto/vehicles.dto'),
          {
            VehicleDto: {},
            CreateVehicleBodyDto: {},
            UpdateVehicleBodyDto: {},
            VehicleSearchQueryDto: {},
          },
        ],
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
        [
          import('./controllers/operators/operators.controller'),
          {
            OperatorsController: {
              listActive: { type: [t['./controllers/operators/dto/operators.dto'].OperatorDto] },
              listAll: { type: [t['./controllers/operators/dto/operators.dto'].OperatorDto] },
              getOne: { type: t['./controllers/operators/dto/operators.dto'].OperatorDto },
              create: { type: t['./controllers/operators/dto/operators.dto'].OperatorDto },
              update: { type: t['./controllers/operators/dto/operators.dto'].OperatorDto },
              setStatus: { type: t['./controllers/operators/dto/operators.dto'].OperatorDto },
              delete: {},
              assignStaff: {
                type: t['./controllers/operators/dto/operators.dto'].PublicStaffUserDto,
              },
            },
          },
        ],
        [
          import('./controllers/routes/routes.controller'),
          {
            RoutesController: {
              list: { type: [t['./controllers/routes/dto/routes.dto'].RouteDto] },
              getOne: { type: t['./controllers/routes/dto/routes.dto'].RouteDto },
              create: { type: t['./controllers/routes/dto/routes.dto'].RouteDto },
              update: { type: t['./controllers/routes/dto/routes.dto'].RouteDto },
              delete: {},
            },
          },
        ],
        [
          import('./controllers/seat-layouts/seat-layouts.controller'),
          {
            SeatLayoutsController: {
              list: { type: [t['./controllers/seat-layouts/dto/seat-layouts.dto'].SeatLayoutDto] },
              getOne: { type: t['./controllers/seat-layouts/dto/seat-layouts.dto'].SeatLayoutDto },
              create: { type: t['./controllers/seat-layouts/dto/seat-layouts.dto'].SeatLayoutDto },
              update: { type: t['./controllers/seat-layouts/dto/seat-layouts.dto'].SeatLayoutDto },
              delete: {},
            },
          },
        ],
        [
          import('./controllers/stations/stations.controller'),
          {
            StationsController: {
              list: { type: [t['./controllers/stations/dto/stations.dto'].StationDto] },
              getOne: { type: t['./controllers/stations/dto/stations.dto'].StationDto },
              create: { type: t['./controllers/stations/dto/stations.dto'].StationDto },
              update: { type: t['./controllers/stations/dto/stations.dto'].StationDto },
              delete: {},
            },
          },
        ],
        [
          import('./controllers/users/users.controller'),
          {
            UsersController: {
              getMe: { type: t['./controllers/users/dto/users.dto'].PublicUserDto },
              updateMe: { type: t['./controllers/users/dto/users.dto'].PublicUserDto },
            },
          },
        ],
        [
          import('./controllers/trips/trips.controller'),
          {
            TripsController: {
              list: { type: [t['./controllers/trips/dto/trips.dto'].TripDto] },
              getOne: { type: t['./controllers/trips/dto/trips.dto'].TripDto },
              create: { type: t['./controllers/trips/dto/trips.dto'].TripDto },
              createBulk: { type: [t['./controllers/trips/dto/trips.dto'].TripDto] },
              setStatus: { type: t['./controllers/trips/dto/trips.dto'].TripDto },
            },
          },
        ],
        [
          import('./controllers/vehicles/vehicles.controller'),
          {
            VehiclesController: {
              list: { type: [t['./controllers/vehicles/dto/vehicles.dto'].VehicleDto] },
              getOne: { type: t['./controllers/vehicles/dto/vehicles.dto'].VehicleDto },
              create: { type: t['./controllers/vehicles/dto/vehicles.dto'].VehicleDto },
              update: { type: t['./controllers/vehicles/dto/vehicles.dto'].VehicleDto },
              delete: {},
            },
          },
        ],
      ],
    },
  };
};

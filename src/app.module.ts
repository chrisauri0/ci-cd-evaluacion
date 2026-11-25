import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { HttpMetricsMiddleware } from './telemetry/http-metrics.middleware';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'app',
      password: process.env.DB_PASS ?? 'app',
      database: process.env.DB_NAME ?? 'appdb',
      autoLoadEntities: true,
      synchronize: true, // práctica escolar: el esquema se crea solo
      retryAttempts: 15,
      retryDelay: 3000,
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

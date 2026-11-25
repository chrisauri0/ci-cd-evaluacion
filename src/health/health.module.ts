import { Controller, Get, Module, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** Comprueba la API y la base de datos (genera una traza con span de PostgreSQL). */
  @Get()
  async check() {
    await this.ds.query('SELECT 1');
    return { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  /** Falla a propósito: sirve para demostrar errores 500, trazas y alertas en OpenObserve. */
  @Get('error')
  fail() {
    throw new InternalServerErrorException('Error provocado para la demostración de alertas');
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}

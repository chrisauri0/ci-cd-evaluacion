import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { appLogger } from '../telemetry/app-logger';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  /** Crea el administrador inicial si la tabla está vacía. */
  async onModuleInit() {
    if ((await this.repo.count()) === 0) {
      await this.create({
        name: 'Administrador',
        email: process.env.ADMIN_EMAIL ?? 'admin@demo.com',
        password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
        role: 'admin',
      });
      appLogger.log('Usuario administrador inicial creado', 'UsersService');
    }
  }

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  /** Incluye passwordHash (solo para el login). */
  findByEmailWithHash(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();
  }

  async create(dto: CreateUserDto) {
    const entity = this.repo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      role: dto.role ?? 'user',
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    try {
      const saved = await this.repo.save(entity);
      return this.findOne(saved.id);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('El correo ya está registrado');
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email.toLowerCase();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      await this.repo.save(user);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('El correo ya está registrado');
      throw e;
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.repo.remove(user);
    return { deleted: true, id };
  }
}

import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { ESTADOS_VALIDACION } from '../data/estados';
import { MIN_CLAVE, ROLES_ADMIN, ROLES_CLIENTE } from '../data/panel';

// ── sesión ──
export class LoginDto {
  @IsString() @Length(1, 60) usuario: string;
  @IsString() @Length(1, 200) clave: string;
}

// ── validaciones ──
export class ListaDto {
  @IsOptional() @IsIn([...ESTADOS_VALIDACION]) estado?: string;
  @IsOptional() @IsString() @Length(3, 14) rut?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) pagina?: number;
}

// ── clientes ──
export class CrearClienteDto {
  // es el valor de la cabecera "id" que usará el cliente: corto, sin espacios
  @IsString() @Matches(/^[a-z0-9][a-z0-9._-]{1,39}$/, { message: 'El id debe tener 2 a 40 caracteres: minúsculas, números, punto, guion o guion bajo' }) id: string;
  @IsString() @Length(2, 120) nombre: string;
  @IsArray() @ArrayMinSize(1) @IsIn([...ROLES_CLIENTE], { each: true }) roles: string[];
}

export class ActualizarClienteDto {
  @IsOptional() @IsString() @Length(2, 120) nombre?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsIn([...ROLES_CLIENTE], { each: true }) roles?: string[];
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class RotarSecretoDto {
  @IsIn(['jwt', 'webhook', 'ambos']) secreto: 'jwt' | 'webhook' | 'ambos';
  @IsOptional() @IsString() @Length(5, 300) motivo?: string;
}

// ── usuarios ──
export class CrearUsuarioDto {
  @IsString() @Matches(/^[a-zA-Z0-9._-]{3,40}$/, { message: 'El usuario debe tener 3 a 40 caracteres: letras, números, punto, guion o guion bajo' }) usuario: string;
  @IsString() @Length(MIN_CLAVE, 200, { message: `La clave debe tener al menos ${MIN_CLAVE} caracteres` }) clave: string;
  @IsIn([...ROLES_ADMIN]) rol: 'superadmin' | 'operador';
}

export class ActualizarUsuarioDto {
  @IsOptional() @IsIn([...ROLES_ADMIN]) rol?: 'superadmin' | 'operador';
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class ClaveDto {
  @IsString() @Length(MIN_CLAVE, 200, { message: `La clave debe tener al menos ${MIN_CLAVE} caracteres` }) clave: string;
}

// ── webhooks ──
export class ListaWebhooksDto {
  @IsOptional() @IsIn(['pendiente', 'fallido', 'entregado', 'descartado']) estado?: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9._-]{1,60}$/) cliente?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) pagina?: number;
}

// ── auditoría ──
export class ListaAuditoriaDto {
  @IsOptional() @IsISO8601() desde?: string;
  @IsOptional() @IsISO8601() hasta?: string;
  @IsOptional() @IsString() @Length(1, 80) actor?: string;
  @IsOptional() @IsString() @Length(1, 80) accion?: string;
  @IsOptional() @IsUUID() validacion_id?: string;
  @IsOptional() @IsString() @Length(1, 60) ip?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) pagina?: number;
}

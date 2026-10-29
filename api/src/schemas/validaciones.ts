import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

const DEV_HTTP = process.env.ALLOW_HTTP_CALLBACKS === 'true';

export class CrearValidacionDto {
  @IsString() @Length(8, 12) rut: string;
  @IsOptional() @IsString() @MaxLength(160) nombre?: string;
  @IsOptional() @IsString() @MaxLength(80) documento_id?: string;
  @IsOptional() @IsString() @MaxLength(120) referencia?: string;
  // En producción solo https con dominio público. ALLOW_HTTP_CALLBACKS=true únicamente para pruebas locales.
  // url_confirmacion: webhook entre servidores · url_retorno: a dónde vuelve el titular al terminar
  @IsOptional() @IsUrl({ protocols: DEV_HTTP ? ['http', 'https'] : ['https'], require_protocol: true, require_tld: !DEV_HTTP }) @MaxLength(500) url_confirmacion?: string;
  @IsOptional() @IsUrl({ protocols: DEV_HTTP ? ['http', 'https'] : ['https'], require_protocol: true, require_tld: !DEV_HTTP }) @MaxLength(500) url_retorno?: string;
}

export class MotivoDto {
  @IsString() @Length(5, 300) motivo: string;
}

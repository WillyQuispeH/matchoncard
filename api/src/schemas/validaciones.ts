import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

const DEV_HTTP = process.env.ALLOW_HTTP_CALLBACKS === 'true';

export class CrearValidacionDto {
  @IsString() @Length(8, 12) rut: string;
  @IsOptional() @IsString() @MaxLength(160) nombre?: string;
  @IsOptional() @IsString() @MaxLength(80) documento_id?: string;
  @IsOptional() @IsString() @MaxLength(120) referencia?: string;
  // En producción solo https con dominio público. ALLOW_HTTP_CALLBACKS=true únicamente para pruebas locales.
  @IsOptional() @IsUrl({ protocols: DEV_HTTP ? ['http', 'https'] : ['https'], require_protocol: true, require_tld: !DEV_HTTP }) @MaxLength(500) callback_url?: string;
}

export class MotivoDto {
  @IsString() @Length(5, 300) motivo: string;
}

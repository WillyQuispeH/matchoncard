export const CLIENTE_ACTIVO = 'select id, nombre, secreto_cifrado, roles from clientes where id = $1 and activo';
export const CLIENTE_POR_ID = 'select id, nombre, roles from clientes where id = $1';

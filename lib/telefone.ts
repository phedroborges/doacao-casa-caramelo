/** Telefone brasileiro: guardamos só os dígitos e formatamos na hora de mostrar. */

export function digitosTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  // Quem cola o número com +55 não precisa apagar o código do país.
  const semPais = digitos.length > 11 ? digitos.replace(/^55/, "") : digitos;
  return semPais.slice(0, 11);
}

export function formatarTelefone(valor: string): string {
  const digitos = digitosTelefone(valor);
  if (digitos.length <= 2) return digitos ? `(${digitos}` : "";
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const prefixo = digitos.length > 10 ? 5 : 4;
  return numero.length <= prefixo
    ? `(${ddd}) ${numero}`
    : `(${ddd}) ${numero.slice(0, prefixo)}-${numero.slice(prefixo)}`;
}

export function telefoneValido(valor: string): boolean {
  const digitos = digitosTelefone(valor);
  if (digitos.length !== 10 && digitos.length !== 11) return false;
  if (Number(digitos.slice(0, 2)) < 11) return false;
  // Celular tem 9 dígitos e começa com 9; fixo tem 8 e começa entre 2 e 5.
  return digitos.length === 11 ? digitos[2] === "9" : /^[2-5]/.test(digitos.slice(2));
}

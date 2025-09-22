// Validación local de cédula y RUC (Ecuador)
export function isCedulaFormat(v){ return /^[0-9]{10}$/.test(v); }
export function isRucFormat(v){ return /^[0-9]{13}$/.test(v) && v.endsWith("001"); }

export function isCedulaValid(cedula){
  if(!isCedulaFormat(cedula)) return false;
  const prov = parseInt(cedula.slice(0,2),10);
  const third = parseInt(cedula[2],10);
  if(prov<1 || prov>24 || third>=6) return false;
  const coef = [2,1,2,1,2,1,2,1,2];
  const digits = cedula.split("").map(n=>+n);
  const sum = coef.reduce((acc,c,i)=>{
    let p = digits[i]*c;
    if(p>=10) p -= 9;
    return acc + p;
  },0);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[9];
}

export function isRucValid(ruc){
  if(!isRucFormat(ruc)) return false;
  const base = ruc.slice(0,10);
  return isCedulaValid(base);
}

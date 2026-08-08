// Инициализация Supabase
const SUPABASE_URL = 'https://yrclsymsijkfbjjqegun.supabase.co';
const SUPABASE_ANON_KEY = 'Sb_publishable_KhFdq-kEENQ4bB6D2H-O8A_C2L_eH8b';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Логика пароля Админа
const ADMIN_PASS = 'AbdOkRjclen484849TldbcnKsnfk';

console.log('Volk Script Hub успешно подключен к Supabase!');

// Загрузка утвержденных скриптов при старте
async function loadScripts() {
  const { data: scripts, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки скриптов:', error);
    return;
  }

  console.log('Загруженные скрипты:', scripts);
}

document.addEventListener('DOMContentLoaded', loadScripts);

SourceGuardian loader для PHP 7.4 (Linux)                                              
SourceGuardian Loader 15.0.2

Архитектура защиты                                                                      
                                                                                                                                 
  1. Шифрование — Blowfish                                                                                                       
   
  - bf_init() / bf_encrypt_buffer() / bf_decrypt_buffer() — Blowfish используется как основной симметричный шифр для расшифровки 
  PHP-файлов на лету                                              
  - Строки и файлы расшифровываются через internal_decode_string_isra_9 / internal_decode_file
                                                                                                                                 
  2. Сжатие — LZSS
                                                                                                                                 
  - lzss_decompress() / lz_decompress() / lzss_getdecompressedsize() — LZSS компрессия поверх шифрования. Файлы хранятся сжатыми,
   расжимаются после дешифровки

  3. Байткод-декодер (ядро)

  - sg_compile_file() — перехватывает zend_compile_file, подменяя стандартный компилятор PHP                                     
  - decode_op_array() — декодирует закодированные опкоды обратно в zend_op_array
  - decode() / decode16() / decode32() / decode_zstr() / decode_zval() / decode_ast() — послойный декодер структур Zend VM       
  (опкоды, строки, zval, AST-деревья)                             
  - sg_bytecode_load() — точка входа загрузки защищённого байткода

  4. Кастомные opcode-хендлеры (антиотладка)

  - SG_OP1_JMPADDR_HANDLER / SG_OP2_JMPADDR_HANDLER — подменяют адреса переходов (jmp)                                           
  - SG_EXT_OFFSET_HANDLER / SG_OP2_EXT_OFFSET_HANDLER — подменяют смещения операндов
  - SG_SMART_BRANCH_HANDLER — перехватывает условные переходы                                                                    
  - SG_CATCH_HANDLER — перехватывает try/catch                    
  - zend_set_user_opcode_handler() — регистрирует эти хендлеры в Zend VM

  5. Привязка к железу (machine fingerprint)

  - get_machine_id() — генерирует уникальный ID машины                                                                           
  - get_mac_addresses() — читает MAC-адреса сетевых интерфейсов
  - gethwinfo() — собирает инфу о железе через libudev (udev_device_new_from_devnum и т.д.)                                      
  - get_rootfs_disk_serial() — серийный номер корневого диска     
  - Результат кешируется в /tmp/.sgid или /var/tmp/.sgid

  6. Лицензирование

  - decode_license() / free_license() — декодирование и валидация лицензии                                                       
  - external_license_key = "-----------------------=" (base64) — внешний лицензионный ключ
  - 28 типов ошибок (error codes [FF]–[25]): привязка к машине, версия PHP, срок лицензии, чексуммы, интернет-проверка           
                                                                  
  7. CRC/Checksum integrity

  - check_loader_crc() — самопроверка целостности самого лоадера                                                                 
  - crc32() / md5_encode() / MD5Transform() — проверка контрольных сумм зашифрованных файлов
  - mem_check() — проверка целостности в памяти (анти-tampering)                                                                 
                                                                  
  8. Антиотладка / анти-реверс

  - Проверка на xdebug и vld расширения (debug_exts = {"xdebug", "vld"})
  - Проверка на zend_test_func / xdebug_var_dump
  - sourceguardian.restrict_unencoded — INI-директива, блокирующая запуск нешифрованных скриптов
                                                                                                                                 
  9. Сетевые проверки
                                                                                                                                 
  - get_server_ip() / get_server_domain() — привязка к IP/домену  
  - get_utc_time() / get_ntp_time() — проверка времени через NTP (анти-откат часов)
  - httpget() / tcpsend() / unixsend() — онлайн-активация/верификация лицензии

  ---
  Итого: Многослойная защита — Blowfish + LZSS + кастомные opcode handlers Zend VM + fingerprint железа + лицензирование +
  самопроверка CRC + антиотладка. Стандартный коммерческий протектор PHP-кода уровня SourceGuardian.                             
   
  1. Явная блокировка VLD                                                                                                        
   
  // line 718                                                                                                                    
  char *debug_exts[2] = { "xdebug", "vld" };                      
  Лоадер при старте проверяет загруженные расширения. Если находит vld — выкинет ошибку (скорее всего error code [16] — "For
  security reasons this protected script cannot run in the current PHP environment").

  2. Подмена конвейера компиляции

  VLD работает тем, что перехватывает zend_compile_file и дампит опкоды. Но SourceGuardian:                                      
   
  - Подменяет zend_compile_file на sg_compile_file (line 931)                                                                    
  - Декодирует опкоды через свой decode_op_array() → decode() / decode_zstr() / decode_zval()
  - Навешивает кастомные хендлеры через zend_set_user_opcode_handler:
    - SG_OP1_JMPADDR_HANDLER — подменяет адреса переходов
    - SG_SMART_BRANCH_HANDLER — подменяет ветвления
    - SG_CATCH_HANDLER — подменяет try/catch
                                                                                                                                 
  Т.е. даже если обойти проверку на VLD, ты увидишь только закодированные/обфусцированные опкоды, которые не имеют смысла без
  прохождения через SG-хендлеры. Реальные адреса переходов и операнды подставляются только в рантайме, в момент выполнения       
  каждого опкода.                                                 

  Коротко: VLD бесполезен против SourceGuardian — расширение детектится и блокируется, а опкоды всё равно закодированы.


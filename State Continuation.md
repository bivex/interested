⏺ State Continuation (не путать с CSRF state параметром) — это механизм защиты от подделки/повтора запросов в OAuth2-подобных потоках, особенно при обмене refresh token на
  access token.

  ---
  Формальная модель

  1. Угроза

  Злоумышленник перехватывает запрос на обмен токенами и:
  - Подменяет grant_type, client_id, scope
  - Повторяет старый запрос (replay attack)
  - Модифицирует claims (например,UID, email)

  2. Защита через State Continuion

  A. Фаза инициализации (AuthManager → AccountManager)

  Client → AccountManager.getAuthToken(account, scope, null)

  Генерация state:
  state = HMAC-SHA256(
      key = device_secret,
      data = {
          "account_id": account_id,
          "scope_hash": SHA256(scope_string),
          "timestamp": now(),
          "nonce": random(128bits)
      }
  )

  State передаётся как opaque параметр в Intent extras.

  ---
  B. Фаза обмена (ChimeraGetToken.smali)

  Запрос на /token включает:
  POST /token
  {
    "grant_type": "refresh_token",
    "refresh_token": "...",
    "client_id": "...",
    "scope": "...",
    "state": "<сгенерированный state>"  # ← КЛЮЧЕВОЙ параметр
  }

  ---
  3. Валидация State на сервере

  Сервер (в контексте Google — Google Play Services) хранит expected_state для:
  - Пары (account_id, scope)
  - Конкретного nonce
  - Таймфрейма (обычно ±5 минут)

  Проверка:
  def validate_state(received_state, account_id, scope):
      # 1. Проверяем подпись
      if not HMAC-SHA256(device_secret, payload) == received_state:
          return ERROR_INVALID_SIGNATURE

      # 2. Проверяем актуальность (one-time use)
      if state_already_used(received_state.nonce):
          return ERROR_STATE_REPLAYED

      # 3. Проверяем scope (не расширен ли без подтверждения)
      if scope_hash != received_state.scope_hash:
          return ERROR_SCOPE_MISMATCH

      # 4. Помечаем nonce как использованный (idempotency key)
      mark_state_used(received_state.nonce)

      return VALID

  ---
  4. Защита от конкретных атак

  ┌──────────────────────┬───────────────────────────────────────────────────────────────┬─────────────────────────────────────────┐
  │        Атака         │                    Без state continuation                     │          С state continuation           │
  ├──────────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ Replay               │ Принят старый токен                                           │ nonce уже помечен → отклонён            │
  ├──────────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ Scope escalation     │ Можно добавить https://www.googleapis.com/auth/youtube.upload │ scope_hash не совпадёт → отклонён       │
  ├──────────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ Account substitution │ Можно использовать token другого аккаунта                     │ account_id в HMAC ≠ received → отклонён │
  ├──────────────────────┼───────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ MITM modification    │ Подмена grant_type                                            │ HMAC-подпись невалидна → отклонён       │
  └──────────────────────┴───────────────────────────────────────────────────────────────┴─────────────────────────────────────────┘

  ---
  5. Криптографические основы

  State = HMAC-SHA256(K, M) где:
  - K = device secret (привязан к SafetyNet/KeyStore, недоступен пользователю)
  - M = account_id || scope_hash || timestamp || nonce

  Security properties:
  1. Unforgeability: Без знания K нельзя сгенерировать валидный state
  2. Binding: State привязан к конкретному account_id и scope
  3. One-time use: nonce хранится в persistent storage (Keystore/SharedPreferences)
  4. Freshness: timestamp ограничен (TLL ~15 мин)

  ---
  6. Пример из APK (cre.smali → TokenWorkflow)

  # Псевдокод из TokenWorkflowClient
  invoke-virtual {v0, v1, v2}, Lcom/google/android/gms/auth/TokenWorkflowClient;->getTokenWithState(
      Landroid/accounts/Account;
      [Ljava/lang/String;
      Landroid/os/Bundle;
  )

  # Bundle содержит:
  bundle.putByteArray("state", generated_state)
  bundle.putString("caller_package", package_name)
  bundle.putLong("timestamp", System.currentTimeMillis())

  На стороне сервера (ChimeraGetToken):
  // Валидация
  if (!stateValidator.validate(state, account, scope)) {
      throw new SecurityException("State verification failed");
  }

  ---
  7. Модель угроз (STRIDE)

  ┌────────────────────────┬────────────────────────────────────────────────┐
  │         Угроза         │               Как защищает state               │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Spoofing               │ HMAC с устройственно-привязанным ключом        │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Tampering              │ Любая модификация payload ломает HMAC          │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Repudiation            │ State привязан к account_id + nonce логируется │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Information Disclosure │ State = ciphertext, не содержит raw данных     │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Denial of Service      │ Nonce-кэш ограничен по размеру (LRU)           │
  ├────────────────────────┼────────────────────────────────────────────────┤
  │ Elevation of Privilege │ Scope mismatch проверяется явно                │
  └────────────────────────┴────────────────────────────────────────────────┘

  ---
  8. Сравнение с CSRF-state

  ┌────────────┬──────────────────────────────┬─────────────────────────────────────┐
  │            │       CSRF state (web)       │     State continuation (mobile)     │
  ├────────────┼──────────────────────────────┼─────────────────────────────────────┤
  │ Цель       │ Защита от cross-site request │ Защита от replay + scope escalation │
  ├────────────┼──────────────────────────────┼─────────────────────────────────────┤
  │ Хранение   │ Cookie/session               │ Keystore/device secret              │
  ├────────────┼──────────────────────────────┼─────────────────────────────────────┤
  │ Transfer   │ Form hidden field / header   │ Intent extras / HTTP body           │
  ├────────────┼──────────────────────────────┼─────────────────────────────────────┤
  │ Validation │ Session equality             │ HMAC equality + nonce check         │
  └────────────┴──────────────────────────────┴─────────────────────────────────────┘

  ---
  Коротко: State continuation = HMAC(device_secret, account+scope+nonce) привязанный к устройству, одноразовый, с ограничением по времени. Ломает replay, scope escalation и
  account substitution атаки через невозможность подписи без device secret.

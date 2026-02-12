# 🔍 Strategy: Divide and Conquer (Remote Isolation)

## 📊 Estado Actual

```
COMMIT: e44b078

┌─────────────────────────────────────────────────┐
│  WORKFLOWS EN PULL REQUEST (GITHUB ACTIONS)     │
├─────────────────────────────────────────────────┤
│ ✅ ci.yml              - ESLint, Prettier, MD   │
│ ⏸️ test.yml            - DISABLED               │
│ ⏸️ contracts.yml       - DISABLED               │
│ ⏸️ golden-paths.yml    - DISABLED               │
└─────────────────────────────────────────────────┘
```

## 🚀 Proceso Step-by-Step

### Step 1: Monitorear ci.yml en Remoto 📡

**URL**: <https://github.com/dunay2/dvt/actions>

Wait for `ci.yml` to finish. If:

- ✅ **PASS**: Continue to Step 2
- ❌ **FAIL**: Review GitHub logs, identify the error, and fix locally

---

### Step 2: Si ci.yml PASÓ → Habilitar test.yml 🧪

```bash
# Opción A: Usar script helper
bash scripts/enable-workflow.sh test.yml

# Opción B: Manual
# 1. Abre: .github/workflows/test.yml
# 2. Uncomment these lines:
#   on:
#     pull_request:
#       branches: [main]
#
# 3. Commit y push:
git add .github/workflows/test.yml
git commit -m "test(ci): Enable test.yml for isolated verification"
git push
```

Luego espera a que `test.yml` se ejecute en GitHub.

---

### Step 3: Si test.yml PASÓ → Habilitar contracts.yml 📋

```bash
bash scripts/enable-workflow.sh contracts.yml
```

O manualmente descomentar `pull_request:` en `contracts.yml`.

---

### Step 4: Si contracts.yml PASÓ → Habilitar golden-paths.yml 🥇

```bash
bash scripts/enable-workflow.sh golden-paths.yml
```

O manualmente descomentar `pull_request:` en `golden-paths.yml`.

---

## ✅ Éxito

Cuando todos los workflows pasen en GitHub

```bash
# Verificar estado local
git log --oneline -5

# Todos los workflows activos
# Commit historia mostrará:
# - e44b078: test(ci): Disable other workflows
# - XXX: test(ci): Enable test.yml
# - XXX: test(ci): Enable contracts.yml
# - XXX: test(ci): Enable golden-paths.yml
```

## ❌ If something fails

### Ver logs en GitHub

1. Ve a: <https://github.com/dunay2/dvt/actions>
2. Click en el workflow fallido
3. Click en el job que falló
4. Busca el step con error rojo
5. Lee el error completo

### Fixear localmente

```bash
# Después de identificar el problema:
1. Open the failing file
2. Haz cambios locales
3. Test: pnpm <script>
4. Git commit
5. Git push
# El workflow volverá a correr automáticamente
```

---

## 📈 Progress Checklist

```
Status: PHASE 1 - Isolating ci.yml
═════════════════════════════════════════

✅ e44b078: Disabled test.yml, contracts.yml, golden-paths.yml
⏳ ESPERANDO: ci.yml pase en GitHub
- [ ] ci.yml ✅ PASS
- [ ] Enable test.yml
- [ ] test.yml ✅ PASS
- [ ] Enable contracts.yml
- [ ] contracts.yml ✅ PASS
- [ ] Enable golden-paths.yml
- [ ] golden-paths.yml ✅ PASS
═════════════════════════════════════════
✅ FINAL: Todos los workflows pasando
```

---

## 💡 Tips

- **No hagas push a main**: Todos los cambios van a `feature/phase2-projector-engine-contracts`
- **Los workflows auto-triggers**: Cada push dispara GitHub Actions automáticamente
- **Rápido feedback**: Cada workflow solo tarda 3-5 minutos
- **Isolation = clarity**: If something fails, it is isolated to that workflow

---

## Next command

```bash
# Monitorea y espera a que ci.yml pase, luego:
bash scripts/enable-workflow.sh test.yml
```

¡Vamos! 🚀

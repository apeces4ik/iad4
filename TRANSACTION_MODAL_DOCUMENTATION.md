# TransactionModal Component

Профессиональный компонент для отображения статуса транзакций blockchain в проекте Aetherium Proxy.

## 📍 Расположение
`/app/frontend/src/components/wallet/TransactionModal.js`

## 🎯 Назначение
Отображает модальное окно с информацией о транзакции, её статусом и деталями. Поддерживает все этапы жизненного цикла транзакции.

## 🔥 Возможности

### Статусы транзакции
- **idle** - Ожидание подтверждения пользователя
- **pending** - Ожидание подписи в кошельке
- **confirming** - Транзакция отправлена, ожидается подтверждение в блокчейне
- **confirmed** - Транзакция успешно выполнена
- **error** - Ошибка выполнения транзакции

### Типы транзакций
- `stake` - Стейкинг токенов
- `unstake` - Анстейк токенов
- `transfer` - Перевод токенов
- `approve` - Одобрение расходования токенов
- `claim` - Получение наград
- `register` - Регистрация ноды
- `deactivate` - Деактивация ноды
- `burn` - Сжигание токенов
- `mint` - Создание NFT

### UI функции
- ✅ Отображение деталей транзакции (сумма, получатель, отправитель)
- ✅ Оценка газа для новых транзакций
- ✅ Копирование хеша транзакции
- ✅ Ссылка на блок-эксплорер
- ✅ Анимации для разных статусов
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Тёмная тема с cyan акцентами

## 📖 Использование

### Базовый пример

```javascript
import { useState } from 'react';
import TransactionModal from '@/components/wallet/TransactionModal';

function MyComponent() {
  const [txModal, setTxModal] = useState({
    open: false,
    transaction: {
      type: 'stake',
      status: 'idle',
      details: {
        amount: '1000',
        symbol: 'AETH',
        apy: '100',
        lockPeriod: '24 months',
        gasEstimate: '0.0021'
      }
    }
  });

  const handleStake = async () => {
    // Обновляем статус на pending
    setTxModal(prev => ({
      ...prev,
      transaction: { ...prev.transaction, status: 'pending' }
    }));

    try {
      // Отправляем транзакцию
      const tx = await stakeContract.stake(amount);
      
      // Обновляем статус на confirming с хешем
      setTxModal(prev => ({
        ...prev,
        transaction: { 
          ...prev.transaction, 
          status: 'confirming',
          hash: tx.hash 
        }
      }));

      // Ждём подтверждения
      await tx.wait();
      
      // Обновляем статус на confirmed
      setTxModal(prev => ({
        ...prev,
        transaction: { ...prev.transaction, status: 'confirmed' }
      }));
    } catch (error) {
      // Обновляем статус на error
      setTxModal(prev => ({
        ...prev,
        transaction: { 
          ...prev.transaction, 
          status: 'error',
          error: error.message 
        }
      }));
    }
  };

  return (
    <>
      <button onClick={() => setTxModal({ ...txModal, open: true })}>
        Stake Tokens
      </button>

      <TransactionModal
        open={txModal.open}
        transaction={txModal.transaction}
        onConfirm={handleStake}
        onCancel={() => setTxModal({ ...txModal, open: false })}
        onClose={() => setTxModal({ ...txModal, open: false })}
      />
    </>
  );
}
```

### Пример с wagmi hooks

```javascript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import TransactionModal from '@/components/wallet/TransactionModal';

function StakingComponent() {
  const [txModal, setTxModal] = useState({ open: false, transaction: {} });
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Обновляем статус на основе wagmi hooks
  useEffect(() => {
    if (isPending) {
      setTxModal(prev => ({
        ...prev,
        transaction: { ...prev.transaction, status: 'pending' }
      }));
    }
  }, [isPending]);

  useEffect(() => {
    if (hash) {
      setTxModal(prev => ({
        ...prev,
        transaction: { ...prev.transaction, status: 'confirming', hash }
      }));
    }
  }, [hash]);

  useEffect(() => {
    if (isSuccess) {
      setTxModal(prev => ({
        ...prev,
        transaction: { ...prev.transaction, status: 'confirmed' }
      }));
    }
  }, [isSuccess]);

  const handleStake = () => {
    writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'stake',
      args: [amount, tier]
    });
  };

  return (
    <TransactionModal
      open={txModal.open}
      transaction={txModal.transaction}
      onConfirm={handleStake}
      onClose={() => setTxModal({ ...txModal, open: false })}
    />
  );
}
```

## 🎨 Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | boolean | ✅ | Открыто ли модальное окно |
| `onClose` | function | ✅ | Обработчик закрытия модального окна |
| `transaction` | object | ✅ | Объект с данными транзакции |
| `transaction.type` | string | ❌ | Тип транзакции (stake, transfer, и т.д.) |
| `transaction.status` | string | ❌ | Статус (idle, pending, confirming, confirmed, error) |
| `transaction.hash` | string | ❌ | Хеш транзакции |
| `transaction.details` | object | ❌ | Детали транзакции |
| `transaction.error` | string | ❌ | Сообщение об ошибке |
| `onConfirm` | function | ❌ | Обработчик подтверждения транзакции |
| `onCancel` | function | ❌ | Обработчик отмены транзакции |

## 📦 transaction.details Object

```javascript
{
  amount: '1000',           // Сумма транзакции
  symbol: 'AETH',           // Символ токена
  to: '0x742d35Cc...',      // Адрес получателя
  from: '0xf39Fd6e5...',    // Адрес отправителя
  gasEstimate: '0.0021',    // Оценка газа (ETH)
  apy: '100',               // APY для стейкинга (%)
  lockPeriod: '24 months',  // Период блокировки
  info: 'Additional info'   // Дополнительная информация
}
```

## 🎨 Стили

Все стили определены в `/app/frontend/src/App.css` в секции **TRANSACTION MODAL STYLES**.

Основные CSS классы:
- `.transaction-modal` - Основной контейнер модального окна
- `.status-icon-container` - Контейнер для иконки статуса
- `.transaction-details` - Карточка с деталями транзакции
- `.detail-row` - Строка с деталью транзакции
- `.transaction-hash` - Карточка с хешем транзакции
- `.error-card` - Карточка с ошибкой
- `.transaction-actions` - Контейнер с кнопками действий
- `.transaction-tip` - Подсказка для пользователя

## 🎯 Примеры использования

Интерактивные примеры доступны по адресу:
```
http://localhost:3000/transaction-modal-example
```

## 📋 Checklist интеграции

- [x] TransactionModal компонент создан
- [x] CSS стили добавлены в App.css
- [x] Компонент экспортирован в wallet/index.js
- [x] Создана страница с примерами
- [x] Маршрут /transaction-modal-example добавлен
- [x] Документация создана

## 🚀 Следующие шаги

1. Интегрировать TransactionModal в StakingEnhanced page
2. Интегрировать TransactionModal в NodeManagement page
3. Интегрировать TransactionModal в VPNConnectEnhanced page
4. Добавить поддержку мультиязычности (i18n)

## 🔗 Связанные файлы

- Component: `/app/frontend/src/components/wallet/TransactionModal.js`
- Styles: `/app/frontend/src/App.css` (строки 4666-4907)
- Examples: `/app/frontend/src/examples/TransactionModalExample.js`
- Export: `/app/frontend/src/components/wallet/index.js`

---

**Created:** Day 46-48 (Wallet Integration)  
**Status:** ✅ Complete  
**Version:** 1.0

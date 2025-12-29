import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";

import { Shell } from "../components/Shell";
import { useAuth } from "../state/auth";
import { apiFetch } from "../lib/api";
import { isIos, isStandalone, urlBase64ToUint8Array } from "../lib/push";

type RequestRow = {
  id: number;
  type: "type1" | "type2";
  phone: string;
  fio: string;
  address: string;
  created_at: number;
  accepted_at: number;
  push_sent_at: number | null;
};

export function DashboardPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"type1" | "type2">("type1");
  const [fio, setFio] = useState("");
  const [address, setAddress] = useState("");

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [pushStatus, setPushStatus] = useState<{
    permission: NotificationPermission | "unsupported";
    subscribed: boolean;
    details?: string;
  }>({ permission: "default", subscribed: false });

  const ios = isIos();
  const standalone = isStandalone();

  const canSubmit = useMemo(() => fio.trim().length >= 2 && address.trim().length >= 5, [fio, address]);

  const loadRequests = async () => {
    if (!token) return;
    const res = await apiFetch<{ requests: RequestRow[] }>("/api/requests", { token });
    setRequests(res.requests);
  };

  const refreshPushStatus = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus({ permission: "unsupported", subscribed: false, details: "Push API недоступен" });
      return;
    }

    const permission = Notification.permission;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setPushStatus({
      permission,
      subscribed: Boolean(sub),
    });
  };

  const enablePush = async () => {
    if (!token) return;
    setError(null);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Push API недоступен в этом браузере");
      return;
    }

    // iOS: пуши только в установленном PWA
    if (ios && !standalone) {
      setError("На iOS push работают только в установленном приложении (Add to Home Screen).");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Нужны разрешения на уведомления (Notification permission).");
      await refreshPushStatus();
      return;
    }

    const { publicKey } = await apiFetch<{ publicKey: string }>("/api/push/vapidPublicKey");
    const reg = await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await apiFetch<{ ok: true }>("/api/push/subscribe", {
      method: "POST",
      token,
      body: JSON.stringify(subscription),
    });

    await refreshPushStatus();
  };

  const createRequest = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ request: RequestRow }>("/api/requests", {
        method: "POST",
        token,
        body: JSON.stringify({
          type,
          fio: fio.trim(),
          address: address.trim(),
        }),
      });
      await loadRequests();
      setFio("");
      setAddress("");
    } catch (err) {
      const apiError = err as { data?: { error?: string } };
      setError(apiError?.data?.error || "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests().catch(() => {});
    refreshPushStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell>
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <NotificationsActiveOutlinedIcon fontSize="small" />
                <Typography variant="h6">Push-уведомления</Typography>
              </Stack>

              {ios ? (
                <Typography variant="body2" color="text.secondary">
                  iOS: push работают только в <b>установленном</b> PWA. Если открыто в Safari — поставь на экран
                  домой через <b>Поделиться → На экран «Домой»</b>.
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={
                    pushStatus.permission === "unsupported"
                      ? "Push: unsupported"
                      : `Permission: ${pushStatus.permission}`
                  }
                  color={pushStatus.permission === "granted" ? "success" : "default"}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={pushStatus.subscribed ? "Subscription: есть" : "Subscription: нет"}
                  color={pushStatus.subscribed ? "success" : "default"}
                  variant="outlined"
                  size="small"
                />
                {ios ? (
                  <Chip
                    label={standalone ? "Режим: установлено" : "Режим: браузер"}
                    variant="outlined"
                    size="small"
                  />
                ) : null}
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={enablePush}>
                  Включить уведомления
                </Button>
                <Button variant="text" startIcon={<RefreshOutlinedIcon />} onClick={() => refreshPushStatus()}>
                  Обновить статус
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Новая заявка</Typography>
              <FormControl>
                <FormLabel>Тип</FormLabel>
                <RadioGroup row value={type} onChange={(e) => setType(e.target.value as "type1" | "type2")}>
                  <FormControlLabel value="type1" control={<Radio />} label="Тип заявки 1" />
                  <FormControlLabel value="type2" control={<Radio />} label="Тип заявки 2" />
                </RadioGroup>
              </FormControl>

              <TextField label="Номер телефона" value={user?.phone || ""} disabled />
              <TextField label="ФИО" value={fio} onChange={(e) => setFio(e.target.value)} required />
              <TextField
                label="Адрес"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                multiline
                minRows={2}
              />

              <Button
                variant="contained"
                size="large"
                startIcon={<SendOutlinedIcon />}
                disabled={!canSubmit || loading}
                onClick={createRequest}
              >
                {loading ? "Отправляем..." : "Отправить заявку"}
              </Button>

              <Typography variant="body2" color="text.secondary">
                После отправки через ~10 секунд придёт push “Заявка принята”.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Последние заявки</Typography>
                <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => loadRequests()}>
                  Обновить
                </Button>
              </Stack>

              <Divider />

              {requests.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Пока пусто.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {requests.map((r) => (
                    <Card key={r.id} variant="outlined" sx={{ bgcolor: "background.paper" }}>
                      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={r.type === "type1" ? "Тип 1" : "Тип 2"}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              #{r.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(r.created_at).toLocaleString()}
                            </Typography>
                            {r.push_sent_at ? (
                              <Chip size="small" color="success" label="Push отправлен" />
                            ) : (
                              <Chip size="small" label="Ожидает push" />
                            )}
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.fio}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {r.address}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ pt: 1, opacity: 0.7 }}>
          <Typography variant="caption" color="text.secondary">
            Подсказка: если пуш не приходит на iOS — проверь, что приложение установлено и сертификат доверенный.
          </Typography>
        </Box>
      </Stack>
    </Shell>
  );
}


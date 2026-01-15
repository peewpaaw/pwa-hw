import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Shell } from "../components/Shell";
import { useAuth } from "../state/auth";

export function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("1111");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => phone.trim().length >= 3 && code.trim().length >= 1, [phone, code]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone.trim(), code.trim());
      nav("/app", { replace: true });
    } catch (err) {
      const apiError = err as { data?: { error?: string } };
      setError(apiError?.data?.error || "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <Box sx={{ pt: 2, display: "grid", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Вход
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Демо: введи любой номер, код всегда <b>1111</b>.
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Stack component="form" onSubmit={onSubmit} spacing={2}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Номер телефона"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                required
              />
              <TextField
                label="Код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                helperText="Подходящий код: 1111"
              />
              <Button type="submit" variant="contained" size="large" disabled={!canSubmit || loading}>
                {loading ? "Входим..." : "Войти"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Shell>
  );
}


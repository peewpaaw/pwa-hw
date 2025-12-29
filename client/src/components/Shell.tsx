import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../state/auth";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar sx={{ borderBottom: "1px solid", borderColor: "divider", backdropFilter: "blur(8px)" }}>
          <Typography sx={{ flex: 1 }} variant="h6">
            Заявки (PWA MVP)
          </Typography>
          {user ? (
            <>
              <Typography variant="body2" sx={{ mr: 2, color: "text.secondary" }}>
                {user.phone}
              </Typography>
              <Button variant="outlined" onClick={logout}>
                Выйти
              </Button>
            </>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}


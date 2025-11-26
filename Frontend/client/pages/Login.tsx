import { useState } from "react";
import logger from "@/lib/logger";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, TextField, Button, Typography, Image } from "injast-core/components";
import { defaultColors } from "injast-core/constants";
import { User, Lock } from "lucide-react";

// Primary color from appColors defined in App.tsx
const PRIMARY_COLOR = "#1DBF98";
const PRIMARY_COLOR_DARK = "#159A7A";

// Logo image URL from Figma - you may want to download and host this locally
const LOGO_URL = "https://www.figma.com/api/mcp/asset/537d6d1e-b047-44cb-b3e1-3c8fd4164d3f";

const schema = z.object({
  username: z
    .string()
    .min(1, "نام کاربری الزامی است")
    .refine((val) => /^09\d{9}$/.test(val), {
      message: "نام کاربری باید شماره موبایل معتبر باشد",
    }),
  password: z.string().min(1, "رمز عبور الزامی است"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const username = watch("username");
  const password = watch("password");
  const isBothFilled = Boolean(username && password && username.trim() && password.trim());

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    try {
      // TODO: Implement login API call
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Login error:',  error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#181D26",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 320,
          bgcolor: "white",
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 6,
          gap: 4,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            height: 53.313,
            width: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={LOGO_URL}
            alt="CFO WIZE Logo"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </Box>

        {/* Form Content */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "flex-end",
          }}
        >
          {/* Title and Subtitle */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              alignItems: "flex-end",
            }}
          >
            <Typography
              variant="h2"
              fontWeight={700}
              sx={{
                fontSize: 16,
                lineHeight: "22px",
                color: defaultColors.neutral.dark,
                width: "100%",
                textAlign: "right",
              }}
            >
              ورود به دشبورد
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                lineHeight: "24px",
                color: defaultColors.neutral.light,
                width: "100%",
                textAlign: "right",
              }}
            >
              نام کاربری و رمز عبور رو وارد کن
            </Typography>
          </Box>

          {/* Form Fields */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Username Field */}
            <TextField
              fullWidth
              height={48}
              placeholder="نام کاربری شماره موبایل شماست"
              error={!!errors.username}
              helperText={errors.username?.message}
              startAdornment={
                <User size={20} color={defaultColors.neutral.light} />
              }
              {...register("username")}
              inputProps={{
                inputMode: "numeric",
                pattern: "[0-9]*",
                onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                },
              }}
            />

            {/* Password Field */}
            <TextField
              fullWidth
              height={48}
              type="password"
              placeholder="رمز عبور"
              error={!!errors.password}
              helperText={errors.password?.message}
              startAdornment={
                <Lock size={20} color={defaultColors.neutral.light} />
              }
              {...register("password")}
            />

            {/* Forgot Password Link */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 32,
                cursor: "pointer",
              }}
              onClick={() => {
                // TODO: Implement forgot password
                
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  lineHeight: "14px",
                  color: PRIMARY_COLOR,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                رمز عبور رو فراموش کردم
              </Typography>
            </Box>

            {/* Submit Button and Terms */}
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Button
                type="submit"
                variant="contained"
                fullWidth
                height={48}
                disabled={!isValid || loading}
                loading={loading}
                sx={{
                  borderRadius: 3,
                  bgcolor: !isValid
                    ? defaultColors.neutral[300]
                    : PRIMARY_COLOR,
                  color: !isValid
                    ? defaultColors.neutral.light
                    : "white",
                  "&:hover": {
                    bgcolor: !isValid
                      ? defaultColors.neutral[300]
                      : PRIMARY_COLOR_DARK,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    lineHeight: "24px",
                    fontWeight: 700,
                  }}
                >
                  تأیید و ورود
                </Typography>
              </Button>

          {/* Terms and Conditions (static text only; no navigation wired yet) */}
          <Typography
            sx={{
              fontSize: 12,
              lineHeight: "20px",
              color: defaultColors.neutral.light,
              textAlign: "center",
              width: "100%",
            }}
          >
            <span>با ورود یعنی </span>
            <span
              style={{
                color: PRIMARY_COLOR,
              }}
            >
              قوانین و مقررات
            </span>
            <span> رو قبول می‌کنی.</span>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}


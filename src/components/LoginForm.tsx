"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authenticate, AuthSession, UserRole, hasRoleAccess } from "@/lib/auth";

interface LoginFormProps {
  requiredRole: UserRole;
  title: string;
  subtitle: string;
  onSuccess: (session: AuthSession) => void;
}

export function LoginForm({
  requiredRole,
  title,
  subtitle,
  onSuccess,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = authenticate(username, password);

    if (!result.success || !result.session) {
      setError(result.error || "Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    // Verificar si el rol obtenido cumple con los permisos requeridos
    if (!hasRoleAccess(result.session, requiredRole)) {
      if (requiredRole === "admin" && result.session.role === "cashier") {
        setError(
          "El usuario 'mostrador' solo tiene acceso al Terminal de Mostrador (/mostrador). No tienes permisos de administración."
        );
      } else {
        setError("No tienes los permisos requeridos para ingresar a esta sección.");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess(result.session);
  };

  const isAdminForm = requiredRole === "admin";

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logotipo y Título de Marca */}
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
              isAdminForm ? "bg-slate-900 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {isAdminForm ? <Store className="w-7 h-7" /> : <ShoppingCart className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Carne & Legumbre
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistema de Gestión Comercial y Control Operativo
            </p>
          </div>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="p-6 pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900">
                {title}
              </CardTitle>
              <Badge
                variant={isAdminForm ? "outline" : "success"}
                className={`text-[10px] font-bold ${
                  isAdminForm
                    ? "border-slate-300 text-slate-700 bg-slate-100"
                    : "border-emerald-300 text-emerald-800 bg-emerald-50"
                }`}
              >
                {isAdminForm ? "Administrador" : "Cajero / Mostrador"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              {subtitle}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 pt-0 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Campo Usuario */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder={isAdminForm ? "andresadmin" : "mostrador"}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full font-bold text-sm h-11 shadow-sm cursor-pointer ${
                  isAdminForm
                    ? "bg-slate-900 hover:bg-slate-950 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {loading ? "Verificando..." : isAdminForm ? "Ingresar al Panel" : "Abrir Turno de Mostrador"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              {/* Enlace alternativo entre vistas */}
              <div className="text-center pt-2">
                {isAdminForm ? (
                  <Link
                    href="/mostrador"
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    ¿Vas a atender mostrador? Ir a /mostrador
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Acceso para Dueño / Administrador
                  </Link>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

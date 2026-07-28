"use client";

import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Header from "@/components/dashboard/Header";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

type MonthlyMenuImage = {
  id: string;
  url: string;
  position: number;
};

const EMPTY_IMAGES: MonthlyMenuImage[] = [];

export default function AdminMonthlyMenuPage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);

  const imagesQuery = useQuery<MonthlyMenuImage[]>({
    queryKey: ["monthly-menu-images"],
    queryFn: () => axios.get("/api/monthly-menu-images").then((response) => response.data),
  });

  const images = imagesQuery.data ?? EMPTY_IMAGES;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["monthly-menu-images"] });

  const addMutation = useMutation({
    mutationFn: (nextUrl: string) => axios.post("/api/monthly-menu-images", { url: nextUrl }),
    onSuccess: () => {
      invalidate();
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/monthly-menu-images/${id}`),
    onSuccess: invalidate,
  });

  const swapMutation = useMutation({
    mutationFn: async ({ a, b }: { a: MonthlyMenuImage; b: MonthlyMenuImage }) => {
      await Promise.all([
        axios.put(`/api/monthly-menu-images/${a.id}`, { position: b.position }),
        axios.put(`/api/monthly-menu-images/${b.id}`, { position: a.position }),
      ]);
    },
    onSuccess: invalidate,
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    swapMutation.mutate({ a: images[index], b: images[index - 1] });
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    swapMutation.mutate({ a: images[index], b: images[index + 1] });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setUploadError("La imagen supera 4MB. Usa una imagen más liviana.");
      return;
    }

    setUploadError("");
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        addMutation.mutate(result);
      }
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setUploadError("No se pudo procesar la imagen. Intenta nuevamente.");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  return (
    <div>
      <Header title="Menú Mensual" subtitle="Imágenes del menú semanal, visibles para los padres" />
      <div className="space-y-5 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Agregar imagen</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Se muestran en orden en la página pública "Monthly Menu". Podés agregar tantas como necesites (una por
            semana, por ejemplo).
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://... link de la imagen"
              className="h-10 min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => url.trim() && addMutation.mutate(url.trim())}
              disabled={!url.trim() || addMutation.isPending}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Agregar link
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Subir imagen
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {isReadingFile ? <p className="mt-2 text-xs font-semibold text-cyan-700">Procesando imagen...</p> : null}
          {uploadError ? <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p> : null}
        </div>

        {imagesQuery.isLoading ? (
          <div className="text-slate-400">Cargando...</div>
        ) : images.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">Todavía no hay imágenes.</p>
            <p className="mt-2 text-sm text-slate-500">Agregá la primera arriba.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative h-48 bg-slate-100">
                  <Image src={image.url} alt="" fill unoptimized className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || swapMutation.isPending}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Mover arriba"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === images.length - 1 || swapMutation.isPending}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Mover abajo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirm("¿Eliminar imagen?") && deleteMutation.mutate(image.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-700"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

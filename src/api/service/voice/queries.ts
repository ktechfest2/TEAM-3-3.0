"use client";
import { useMutation } from "@tanstack/react-query";
import { transcribeAudio } from "./api";
import type { Lang } from "@/i18n";

export const useTranscribe = () => useMutation({ mutationFn: (v: { blob: Blob; lang: Lang }) => transcribeAudio(v.blob, v.lang) });

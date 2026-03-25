/**
 * API Route — Inscription utilisateur
 * POST /api/auth/register
 *
 * 👉 Ce que fait cette route :
 * 1. Reçoit { email, password, prenom, nom, pseudo? } dans le body JSON
 * 2. Vérifie que tous les champs requis sont présents
 * 3. Vérifie que l'email n'est pas déjà utilisé
 * 4. Hash le mot de passe avec bcrypt (on ne stocke JAMAIS le mot de passe en clair)
 * 5. Crée le User dans la BDD
 * 6. Pose un cookie de session → l'utilisateur est connecté directement après inscription
 * 7. Retourne les infos publiques du user (sans le hash du mot de passe !)
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, prenom, nom, pseudo } = body;

    // ===== VALIDATION =====
    // 👉 On vérifie que les champs obligatoires sont présents
    if (!email || !password || !prenom || !nom) {
      return NextResponse.json(
        { error: "Email, mot de passe, prénom et nom sont requis" },
        { status: 400 }
      );
    }

    // 👉 Validation basique du mot de passe (au moins 6 caractères)
    // En prod on pourrait être plus strict (majuscule, chiffre, etc.)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    // ===== CHECK DOUBLON EMAIL =====
    // 👉 On cherche si un user avec cet email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 } // 409 = Conflict
      );
    }

    // ===== HASH DU MOT DE PASSE =====
    // 👉 bcrypt.hash() transforme "monMotDePasse" en un hash irréversible
    // Le "10" = salt rounds (nombre de tours de chiffrement)
    // Plus c'est élevé, plus c'est sécurisé mais plus c'est lent
    // 10 = bon compromis pour une app web classique
    const passwordHash = await bcrypt.hash(password, 10);

    // ===== CRÉATION DU USER =====
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        prenom: prenom.trim(),
        nom: nom.trim(),
        pseudo: pseudo?.trim() || null,
        // role: "USER" par défaut (défini dans le schema Prisma)
      },
      // 👉 select: on choisit quels champs retourner
      // On ne retourne JAMAIS passwordHash au client
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        pseudo: true,
        role: true,
        createdAt: true,
      },
    });

    // ===== COOKIE DE SESSION =====
    // 👉 On crée la réponse, puis on pose le cookie dessus
    const response = NextResponse.json({
      success: true,
      user,
    });

    setSessionCookie(response, user.id);

    return response;
  } catch (error) {
    console.error("Erreur register:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}

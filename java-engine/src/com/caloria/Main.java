package com.caloria;

import com.caloria.model.*;
import com.caloria.exceptions.DeficitPeligrosoException;

/**
 * Main.java — Motor de cálculo nutricional (consola)
 * Materia: POO Java - UNPAZ
 * 
 * Demuestra polimorfismo: mismo método calcularTDEE(), 
 * diferente resultado según el tipo de usuario.
 */
public class Main {
    public static void main(String[] args) {

        // ── Polimorfismo en acción ────────────────────────────
        Usuario[] usuarios = {
            new UsuarioSedentario("1","ana@test.com", 65, 162, 30, 'F', "perder"),
            new UsuarioModerado  ("2","leo@test.com", 80, 178, 25, 'M', "mantener"),
        };

        System.out.println("══════════════════════════════════════════");
        System.out.println("      CALORIA-AR · Motor Java v2.0        ");
        System.out.println("══════════════════════════════════════════");

        for (Usuario u : usuarios) {
            System.out.println("\n" + u);
            System.out.printf("  TMB:    %.0f kcal%n", u.calcularTMB());
            System.out.printf("  TDEE:   %.0f kcal (%s)%n", u.calcularTDEE(), u.getNivelActividad());

            try {
                System.out.printf("  Meta:   %.0f kcal (objetivo: %s)%n",
                        u.calcularMetaCalorica(), u.getObjetivo());
            } catch (DeficitPeligrosoException e) {
                System.out.println("  ⚠️  " + e.getMessage());
            }

            System.out.printf("  IMC:    %.1f → %s%n", u.calcularIMC(), u.clasificarIMC());
        }
        System.out.println("\n══════════════════════════════════════════");
    }
}

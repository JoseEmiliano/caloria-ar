// ─── UsuarioSedentario.java ──────────────────────────────────
package com.caloria.model;

public class UsuarioSedentario extends Usuario {
    public UsuarioSedentario(String id, String email, double peso,
                             double altura, int edad, char genero, String objetivo) {
        super(id, email, peso, altura, edad, genero, objetivo);
    }
    @Override public double getFactorActividad() { return 1.2; }
    @Override public String getNivelActividad()  { return "Sedentario"; }
}

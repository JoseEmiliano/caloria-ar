package com.caloria.model;

import com.caloria.interfaces.Calculable;
import com.caloria.exceptions.DeficitPeligrosoException;

/**
 * Clase abstracta Usuario
 * Materia: POO - Java - UNPAZ
 * 
 * Demuestra:
 *   - Encapsulación (atributos privados + getters)
 *   - Abstracción (clase abstracta)
 *   - Herencia (subclases definen el factor de actividad)
 *   - Polimorfismo (calcularTDEE() varía por subclase)
 */
public abstract class Usuario implements Calculable {

    // ── Atributos encapsulados ────────────────────────────────
    private final String id;
    private final String email;
    private double pesoKg;
    private double alturaCm;
    private int    edad;
    private char   genero;   // 'M' | 'F' | 'O'
    private String objetivo; // "perder" | "mantener" | "ganar"

    // Ajuste calórico por objetivo (kcal)
    private static final int AJUSTE_PERDER    = -500;
    private static final int AJUSTE_MANTENER  = 0;
    private static final int AJUSTE_GANAR     = 300;
    private static final int MIN_CALORIAS_SEGURAS = 1200;

    // ── Constructor ───────────────────────────────────────────
    protected Usuario(String id, String email, double pesoKg,
                      double alturaCm, int edad, char genero, String objetivo) {
        this.id       = id;
        this.email    = email;
        this.pesoKg   = pesoKg;
        this.alturaCm = alturaCm;
        this.edad     = edad;
        this.genero   = genero;
        this.objetivo = objetivo;
    }

    // ── Método abstracto: subclases definen factor actividad ──
    protected abstract double getFactorActividad();
    public abstract String    getNivelActividad();

    // ── Implementación Calculable ─────────────────────────────

    /**
     * Tasa Metabólica Basal — Fórmula Mifflin-St Jeor
     */
    @Override
    public double calcularTMB() {
        double base = (10 * pesoKg) + (6.25 * alturaCm) - (5 * edad);
        return genero == 'M' ? base + 5 : base - 161;
    }

    /**
     * Gasto Energético Diario Total
     * Polimorfismo: cada subclase aporta su factor de actividad
     */
    @Override
    public double calcularTDEE() {
        return Math.round(calcularTMB() * getFactorActividad());
    }

    /**
     * Meta calórica ajustada al objetivo
     * @throws DeficitPeligrosoException si la meta es menor al mínimo seguro
     */
    @Override
    public double calcularMetaCalorica() throws DeficitPeligrosoException {
        int ajuste = switch (objetivo.toLowerCase()) {
            case "perder"   -> AJUSTE_PERDER;
            case "ganar"    -> AJUSTE_GANAR;
            default         -> AJUSTE_MANTENER;
        };
        double meta = calcularTDEE() + ajuste;
        if (meta < MIN_CALORIAS_SEGURAS) {
            throw new DeficitPeligrosoException(meta, MIN_CALORIAS_SEGURAS);
        }
        return meta;
    }

    /**
     * Índice de Masa Corporal
     */
    @Override
    public double calcularIMC() {
        double alturaM = alturaCm / 100.0;
        return Math.round((pesoKg / (alturaM * alturaM)) * 10.0) / 10.0;
    }

    public String clasificarIMC() {
        double imc = calcularIMC();
        if      (imc < 18.5) return "Bajo peso";
        else if (imc < 25.0) return "Peso normal";
        else if (imc < 30.0) return "Sobrepeso";
        else if (imc < 35.0) return "Obesidad grado I";
        else if (imc < 40.0) return "Obesidad grado II";
        else                 return "Obesidad grado III";
    }

    // ── Getters ───────────────────────────────────────────────
    public String getId()       { return id; }
    public String getEmail()    { return email; }
    public double getPesoKg()   { return pesoKg; }
    public double getAlturaCm() { return alturaCm; }
    public int    getEdad()     { return edad; }
    public char   getGenero()   { return genero; }
    public String getObjetivo() { return objetivo; }

    // ── Setters con validación ────────────────────────────────
    public void setPesoKg(double pesoKg) {
        if (pesoKg <= 0) throw new IllegalArgumentException("El peso debe ser mayor a 0");
        this.pesoKg = pesoKg;
    }

    @Override
    public String toString() {
        return String.format("Usuario[%s | %.1fkg | %.0fcm | %d años | Actividad: %s]",
                email, pesoKg, alturaCm, edad, getNivelActividad());
    }
}

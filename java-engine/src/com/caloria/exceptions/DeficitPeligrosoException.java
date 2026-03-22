package com.caloria.exceptions;

/**
 * DeficitPeligrosoException
 * Excepción personalizada para déficits calóricos peligrosos
 * Materia: POO Java - UNPAZ
 */
public class DeficitPeligrosoException extends RuntimeException {
    private final double metaCalculada;
    private final double minimoSeguro;

    public DeficitPeligrosoException(double metaCalculada, double minimoSeguro) {
        super(String.format(
            "⚠️ La meta calculada (%.0f kcal) es peligrosamente baja. " +
            "El mínimo seguro es %.0f kcal. Consultá un nutricionista.",
            metaCalculada, minimoSeguro
        ));
        this.metaCalculada = metaCalculada;
        this.minimoSeguro  = minimoSeguro;
    }

    public double getMetaCalculada() { return metaCalculada; }
    public double getMinimoSeguro()  { return minimoSeguro; }
}

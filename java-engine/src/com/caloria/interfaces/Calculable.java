package com.caloria.interfaces;

/**
 * Interfaz Calculable
 * Materia: Programación Orientada a Objetos - Java
 * 
 * Define el contrato que todo calculador nutricional debe cumplir.
 * Principio de Diseño: Programar a interfaces, no a implementaciones.
 */
public interface Calculable {
    double calcularTMB();
    double calcularTDEE();
    double calcularMetaCalorica();
    double calcularIMC();
}

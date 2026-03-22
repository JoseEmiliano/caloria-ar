// UsuarioModerado.java
package com.caloria.model;
public class UsuarioModerado extends Usuario {
    public UsuarioModerado(String id,String email,double peso,double altura,int edad,char genero,String objetivo){super(id,email,peso,altura,edad,genero,objetivo);}
    @Override public double getFactorActividad(){return 1.55;}
    @Override public String getNivelActividad(){return "Moderado (3-5 días/semana)";}
}

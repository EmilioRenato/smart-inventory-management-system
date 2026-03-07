package com.tienda.signer.dto;

import jakarta.validation.constraints.NotBlank;

public class SignRequest {

    @NotBlank
    private String xml;

    @NotBlank
    private String p12Base64;

    @NotBlank
    private String p12Password;

    public String getXml() {
        return xml;
    }

    public void setXml(String xml) {
        this.xml = xml;
    }

    public String getP12Base64() {
        return p12Base64;
    }

    public void setP12Base64(String p12Base64) {
        this.p12Base64 = p12Base64;
    }

    public String getP12Password() {
        return p12Password;
    }

    public void setP12Password(String p12Password) {
        this.p12Password = p12Password;
    }
}
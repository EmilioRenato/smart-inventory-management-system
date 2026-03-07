package com.tienda.signer.dto;

public class SignResponse {

    private boolean success;
    private String message;
    private String signedXml;

    public SignResponse() {
    }

    public SignResponse(boolean success, String message, String signedXml) {
        this.success = success;
        this.message = message;
        this.signedXml = signedXml;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public String getSignedXml() {
        return signedXml;
    }

    public void setSignedXml(String signedXml) {
        this.signedXml = signedXml;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
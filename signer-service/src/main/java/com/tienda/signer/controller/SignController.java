package com.tienda.signer.controller;

import com.tienda.signer.dto.SignRequest;
import com.tienda.signer.dto.SignResponse;
import jakarta.validation.Valid;
import org.apache.xml.security.Init;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.InputSource;
import xades4j.algorithms.EnvelopedSignatureTransform;
import xades4j.production.DataObjectReference;
import xades4j.production.SignedDataObjects;
import xades4j.production.XadesBesSigningProfile;
import xades4j.production.XadesSigner;
import xades4j.providers.KeyingDataProvider;
import xades4j.providers.impl.DirectKeyingDataProvider;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Enumeration;

@RestController
@RequestMapping("/signer")
@CrossOrigin("*")
public class SignController {

    static {
        Init.init();
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Signer service OK");
    }

    @PostMapping("/sign")
    public ResponseEntity<SignResponse> sign(@Valid @RequestBody SignRequest request) {
        try {
            char[] password = request.getP12Password().toCharArray();
            byte[] p12Bytes = Base64.getDecoder().decode(request.getP12Base64());

            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(new ByteArrayInputStream(p12Bytes), password);

            String alias = null;
            Enumeration<String> aliases = keyStore.aliases();
            while (aliases.hasMoreElements()) {
                String current = aliases.nextElement();
                if (keyStore.isKeyEntry(current)) {
                    alias = current;
                    break;
                }
            }

            if (alias == null) {
                return ResponseEntity.badRequest().body(
                    new SignResponse(false, "No se encontró una clave privada en el archivo .p12", "")
                );
            }

            PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, password);
            X509Certificate certificate = (X509Certificate) keyStore.getCertificate(alias);

            if (privateKey == null || certificate == null) {
                return ResponseEntity.badRequest().body(
                    new SignResponse(false, "No se pudo leer la clave privada o el certificado del .p12", "")
                );
            }

            // Parsear XML
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setNamespaceAware(true);
            DocumentBuilder db = dbf.newDocumentBuilder();
            Document doc = db.parse(new InputSource(new StringReader(request.getXml())));

            Element root = doc.getDocumentElement();

            // ✅ Usar SOLO el atributo "id" que ya viene en tu XML
            // y NO agregar "Id", porque el SRI lo rechaza en <factura>
            if (!root.hasAttribute("id")) {
                root.setAttribute("id", "comprobante");
            }
            root.setIdAttribute("id", true);

            SignedDataObjects signedDataObjects = new SignedDataObjects()
                .withSignedDataObject(
                    new DataObjectReference("#" + root.getAttribute("id"))
                        .withTransform(new EnvelopedSignatureTransform())
                );

            KeyingDataProvider keyingDataProvider =
                new DirectKeyingDataProvider(certificate, privateKey);

            XadesSigner signer = new XadesBesSigningProfile(keyingDataProvider).newSigner();

            signer.sign(signedDataObjects, root);

            TransformerFactory tf = TransformerFactory.newInstance();
            Transformer transformer = tf.newTransformer();
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");

            StringWriter writer = new StringWriter();
            transformer.transform(new DOMSource(doc), new StreamResult(writer));

            String signedXml = writer.toString();

            return ResponseEntity.ok(
                new SignResponse(true, "XML firmado correctamente en XAdES-BES", signedXml)
            );

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(
                new SignResponse(false, "Error firmando XML: " + e.getMessage(), "")
            );
        }
    }
}
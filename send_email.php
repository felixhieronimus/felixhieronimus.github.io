<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = strip_tags(trim($_POST["name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $message = trim($_POST["message"]);

    // Ici, spécifiez l'adresse email où vous souhaitez recevoir les messages.
    $to = "felixhieronimus@gmail.com";
    
    // Spécifiez le sujet de l'email
    $subject = "Nouveau message de formulaire de contact de $name";
    
    // Construisez le corps de l'email.
    $email_content = "Nom: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Message:\n$message\n";

    // Construisez les headers de l'email.
    $email_headers = "From: $name <$email>";

    // Enfin, envoyez l'email.
    mail($to, $subject, $email_content, $email_headers);
    
    // Redirigez vers une page de confirmation.
    header("Location: merci.html");
} else {
    // Pas une requête POST, redirigez vers le formulaire.
    header("Location: contact.html");
    exit;
}
?>

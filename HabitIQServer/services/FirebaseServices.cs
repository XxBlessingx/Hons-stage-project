using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

public class FirebaseService
{
    public FirebaseService()
    {
        if (FirebaseApp.DefaultInstance == null)
        {
            FirebaseApp.Create(new AppOptions
            {
                Credential = GoogleCredential.FromStream(
                    new FileStream("firebase/firebase-adminsdk.json", FileMode.Open, FileAccess.Read)
                )
            });
        }
    }
}

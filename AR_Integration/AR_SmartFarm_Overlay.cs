using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using TMPro;

/*
 * AUGMENTED REALITY IOT INTEGRATION
 * Place this script on a 3D Water Droplet Hologram object inside a Unity3D Vuforia Image Target.
 * When the camera sees the physical plant pot, the 3D Droplet appears,
 * scaling its physical Y-Axis dynamically based on the ESP32's Soil Moisture telemetry.
 */

public class AR_SmartFarm_Overlay : MonoBehaviour
{
    // The IP Address of the ESP32 SoftAP Web Server
    public string esp32_api_url = "http://192.168.4.1/api/data";
    
    // UI Elements floating in AR Space
    public TextMeshPro moistureText;
    public TextMeshPro aiForecastText;

    // Local configuration
    private float updateInterval = 2.0f; 

    // Define JSON schema to match the ESP32 output
    [System.Serializable]
    public class TelemetryData {
        public float moisture_pct;
        public int seconds_to_sleep;
        public bool pump_active;
        public float ai_wilting_prob;
    }

    void Start()
    {
        // Start polling the edge node
        StartCoroutine(FetchTelemetryRoutine());
    }

    IEnumerator FetchTelemetryRoutine()
    {
        while (true)
        {
            using (UnityWebRequest webRequest = UnityWebRequest.Get(esp32_api_url))
            {
                // Send request
                yield return webRequest.SendWebRequest();

                if (webRequest.result == UnityWebRequest.Result.ConnectionError || 
                    webRequest.result == UnityWebRequest.Result.ProtocolError)
                {
                    Debug.LogError("Error Fetching Edge Telemetry: " + webRequest.error);
                    if(moistureText != null) moistureText.text = "OFFLINE";
                }
                else
                {
                    string jsonResponse = webRequest.downloadHandler.text;
                    
                    // Parse JSON payload
                    TelemetryData data = JsonUtility.FromJson<TelemetryData>(jsonResponse);
                    
                    // 1. Scale the 3D Holographic Droplet
                    // If moisture is 100%, scale Y is 1.0f. If 0%, scale y is 0.1f.
                    float targetYScale = Mathf.Clamp(data.moisture_pct / 100f, 0.1f, 1.0f);
                    
                    // Smoothly animate the transition in 3D space
                    Vector3 currentScale = transform.localScale;
                    transform.localScale = Vector3.Lerp(currentScale, new Vector3(currentScale.x, targetYScale, currentScale.z), Time.deltaTime * 5f);
                    
                    // 2. Update AR Text Overlays
                    if(moistureText != null) moistureText.text = data.moisture_pct.ToString("F1") + "% Moisture";
                    if(aiForecastText != null) {
                        aiForecastText.text = "AI Wilting Forecast: " + data.ai_wilting_prob.ToString("F1") + "%";
                        if(data.ai_wilting_prob > 50f) aiForecastText.color = Color.red;
                        else aiForecastText.color = Color.green;
                    }

                    // 3. Holographic Particle Effects if Pump Active
                    var particleSystem = GetComponentInChildren<ParticleSystem>();
                    if(data.pump_active && !particleSystem.isPlaying) {
                        particleSystem.Play();
                    } else if (!data.pump_active && particleSystem.isPlaying) {
                        particleSystem.Stop();
                    }
                }
            }
            // Wait 2 seconds before polling again
            yield return new WaitForSeconds(updateInterval);
        }
    }
    
    // Allow users to tap the AR droplet itself to override
    public void UserTappedARObject() {
         StartCoroutine(ForceIrrigationRoutine());
    }
    
    IEnumerator ForceIrrigationRoutine() {
         WWWForm form = new WWWForm();
         form.AddField("state", "1"); // Force ON
         
         using (UnityWebRequest www = UnityWebRequest.Post("http://192.168.4.1/api/pump", form))
         {
             yield return www.SendWebRequest();
             Debug.Log("Forced AR Actuation!");
         }
    }
}

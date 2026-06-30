from flask import Flask, request, jsonify, render_template
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)

# Load model and scaler
model = joblib.load('models/random_forest.pkl')
scaler = joblib.load('models/scaler.pkl')

# Expected feature order exactly as the model was trained
FEATURE_ORDER = [
    'Unnamed: 0', 'SeniorCitizen', 'Partner', 'Dependents', 'tenure',
    'MultipleLines', 'OnlineSecurity', 'OnlineBackup', 'DeviceProtection',
    'TechSupport', 'StreamingTV', 'StreamingMovies', 'PaperlessBilling',
    'MonthlyCharges', 'InternetService_Fiber optic', 'InternetService_No',
    'Contract_One year', 'Contract_Two year',
    'PaymentMethod_Credit card (automatic)', 'PaymentMethod_Electronic check',
    'PaymentMethod_Mailed check'
]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # Helper to safely parse numbers
        def parse_num(val, default=0.0):
            try:
                return float(val)
            except:
                return default

        # 1. Scale numeric features
        tenure = parse_num(data.get('tenure'))
        monthly_charges = parse_num(data.get('MonthlyCharges'))
        
        scaled_numerics = scaler.transform([[tenure, monthly_charges]])
        scaled_tenure = scaled_numerics[0][0]
        scaled_charges = scaled_numerics[0][1]

        # 2. Map binary inputs (Yes=1, No=0, Male=1, Female=0)
        # Assuming frontend sends exactly 'Yes'/'No' or '1'/'0' string/int
        def parse_binary(val):
            if str(val).lower() in ['yes', '1', 'true', 'male']:
                return 1
            return 0
        
        # 3. Build the feature dictionary
        features = {
            'Unnamed: 0': 0, # Dummy index
            'SeniorCitizen': parse_binary(data.get('SeniorCitizen')),
            'Partner': parse_binary(data.get('Partner')),
            'Dependents': parse_binary(data.get('Dependents')),
            'tenure': scaled_tenure,
            'MultipleLines': parse_binary(data.get('MultipleLines')),
            'OnlineSecurity': parse_binary(data.get('OnlineSecurity')),
            'OnlineBackup': parse_binary(data.get('OnlineBackup')),
            'DeviceProtection': parse_binary(data.get('DeviceProtection')),
            'TechSupport': parse_binary(data.get('TechSupport')),
            'StreamingTV': parse_binary(data.get('StreamingTV')),
            'StreamingMovies': parse_binary(data.get('StreamingMovies')),
            'PaperlessBilling': parse_binary(data.get('PaperlessBilling')),
            'MonthlyCharges': scaled_charges,
            
            # One-Hot Encoding for InternetService
            'InternetService_Fiber optic': 1 if data.get('InternetService') == 'Fiber optic' else 0,
            'InternetService_No': 1 if data.get('InternetService') == 'No' else 0,
            
            # One-Hot Encoding for Contract
            'Contract_One year': 1 if data.get('Contract') == 'One year' else 0,
            'Contract_Two year': 1 if data.get('Contract') == 'Two year' else 0,
            
            # One-Hot Encoding for PaymentMethod
            'PaymentMethod_Credit card (automatic)': 1 if data.get('PaymentMethod') == 'Credit card (automatic)' else 0,
            'PaymentMethod_Electronic check': 1 if data.get('PaymentMethod') == 'Electronic check' else 0,
            'PaymentMethod_Mailed check': 1 if data.get('PaymentMethod') == 'Mailed check' else 0,
        }

        # 4. Convert to DataFrame in exact order
        input_df = pd.DataFrame([features])[FEATURE_ORDER]
        
        # 5. Predict
        probability = model.predict_proba(input_df)[0][1]
        prediction = int(model.predict(input_df)[0])
        
        # Calculate insights (Risk Factors and Recommendations)
        risk_factors = []
        if data.get('Contract') == 'Month-to-month':
            risk_factors.append("Month-to-month Contract (No long-term commitment)")
        if data.get('InternetService') == 'Fiber optic':
            risk_factors.append("Fiber Optic Internet (Historically high churn rate)")
        try:
            if int(data.get('tenure', 0)) <= 12:
                risk_factors.append("Low Tenure (Customer is in the high-risk first year)")
        except ValueError:
            pass
        if data.get('TechSupport') == 'No' and data.get('InternetService') != 'No':
            risk_factors.append("No Tech Support")
        if data.get('PaymentMethod') == 'Electronic check':
            risk_factors.append("Electronic Check (Historically high risk payment method)")
            
        recommendation = "Customer is currently stable. Maintain regular engagement."
        if probability >= 0.5:
            if data.get('Contract') == 'Month-to-month':
                recommendation = "Offer a discount to upgrade to a 1-Year or 2-Year Contract. This will significantly reduce immediate churn risk."
            elif data.get('TechSupport') == 'No':
                recommendation = "Provide 3 months of free Tech Support to improve service satisfaction."
            elif data.get('InternetService') == 'Fiber optic':
                recommendation = "Check for technical issues and ensure they are getting the advertised speeds to justify the premium cost."
            else:
                recommendation = "Reach out for a personalized check-in to identify service pain points."

        # Format response
        result = {
            'success': True,
            'prediction': int(prediction),
            'prediction_text': 'Will Churn' if prediction == 1 else 'Will Stay',
            'probability': float(probability),
            'risk_factors': risk_factors,
            'recommendation': recommendation
        }
        
        return jsonify(result)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    # Run on port 5000, visible to all
    app.run(host='0.0.0.0', port=5000, debug=True)

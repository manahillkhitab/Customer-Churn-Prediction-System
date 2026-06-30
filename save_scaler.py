import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os

print("Loading cleaned dataset...")
df = pd.read_csv('data/Telco-Customer-Churn-cleaned.csv')

print("Fitting StandardScaler on 'tenure' and 'MonthlyCharges'...")
scaler = StandardScaler()
# Fit only on tenure and MonthlyCharges to extract parameters
scaler.fit(df[['tenure', 'MonthlyCharges']])

os.makedirs('models', exist_ok=True)
joblib.dump(scaler, 'models/scaler.pkl')

print(f"Scaler saved to models/scaler.pkl successfully!")
print(f"Mean: {scaler.mean_}")
print(f"Scale (Std): {scaler.scale_}")

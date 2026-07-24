import pandas as pd, json
df = pd.read_csv(r'c:\Users\mitta\Desktop\PROJECTS\UHI-System\backend\models\uhi_dataset.csv')
stats = {}
for col in ['lst','ndvi','ndbi','evi','elevation','ntl','lst_delta']:
    s = df[col].describe()
    stats[col] = {'count':int(s['count']),'mean':round(s['mean'],4),'std':round(s['std'],4),'min':round(s['min'],4),'25p':round(s['25%'],4),'50p':round(s['50%'],4),'75p':round(s['75%'],4),'max':round(s['max'],4)}

corrs = {}
for col in ['lst','ndvi','ndbi','evi','elevation','ntl']:
    corrs[col] = round(df['lst_delta'].corr(df[col]),4)
stats['correlations_with_lst_delta'] = corrs

uhi1 = df[df['uhi_label']==1]
uhi0 = df[df['uhi_label']==0]
stats['class_breakdown'] = {
    'uhi_1_count': int(len(uhi1)), 'uhi_0_count': int(len(uhi0)),
    'uhi_1_mean_lst_delta': round(uhi1['lst_delta'].mean(),4),
    'uhi_0_mean_lst_delta': round(uhi0['lst_delta'].mean(),4),
    'uhi_1_mean_lst': round(uhi1['lst'].mean(),4),
    'uhi_0_mean_lst': round(uhi0['lst'].mean(),4),
    'uhi_1_mean_ndvi': round(uhi1['ndvi'].mean(),4),
    'uhi_0_mean_ndvi': round(uhi0['ndvi'].mean(),4),
    'uhi_1_mean_ndbi': round(uhi1['ndbi'].mean(),4),
    'uhi_0_mean_ndbi': round(uhi0['ndbi'].mean(),4),
    'uhi_1_mean_evi': round(uhi1['evi'].mean(),4),
    'uhi_0_mean_evi': round(uhi0['evi'].mean(),4),
    'uhi_1_mean_elevation': round(uhi1['elevation'].mean(),4),
    'uhi_0_mean_elevation': round(uhi0['elevation'].mean(),4),
    'uhi_1_mean_ntl': round(uhi1['ntl'].mean(),4),
    'uhi_0_mean_ntl': round(uhi0['ntl'].mean(),4),
    'uhi_1_std_lst_delta': round(uhi1['lst_delta'].std(),4),
    'uhi_0_std_lst_delta': round(uhi0['lst_delta'].std(),4),
}
stats['climate_zone_distribution'] = df['climate_zone'].value_counts().to_dict()
stats['uhi_rate_per_zone'] = df.groupby('climate_zone')['uhi_label'].mean().round(4).to_dict()
print(json.dumps(stats, indent=2))

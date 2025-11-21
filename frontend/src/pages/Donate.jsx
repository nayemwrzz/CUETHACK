import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignAPI, pledgeAPI, paymentAPI } from '../services/api';
import './Donate.css';

function Donate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    message: '',
    anonymous: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const response = await campaignAPI.getById(id);
      setCampaign(response.data.data.campaign || response.data.data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    }
  };

  const generateIdempotencyKey = () => {
    return `pledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const idempotencyKey = generateIdempotencyKey();

      // Step 1: Create pledge
      const pledgeResponse = await pledgeAPI.create({
        campaignId: id,
        amount: parseFloat(formData.amount),
        idempotencyKey,
        userId: user?.id || null,
        anonymous: formData.anonymous,
        message: formData.message,
      });

      const pledgeId = pledgeResponse.data.data.pledge._id || pledgeResponse.data.data.pledge.id;

      // Step 2: Process payment
      const paymentIdempotencyKey = generateIdempotencyKey();
      await paymentAPI.create({
        pledgeId,
        amount: parseFloat(formData.amount),
        idempotencyKey: paymentIdempotencyKey,
        paymentMethod: 'STRIPE',
      });

      setSuccess('Donation successful! Thank you for your contribution.');
      setTimeout(() => {
        navigate(`/campaigns/${id}`);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Failed to process donation');
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div className="donate-page">
        <h1>Donate to {campaign.title}</h1>
        
        <form onSubmit={handleSubmit} className="donate-form">
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Leave a message of support..."
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.anonymous}
                onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
              />
              Donate anonymously
            </label>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Processing...' : 'Donate Now'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Donate;


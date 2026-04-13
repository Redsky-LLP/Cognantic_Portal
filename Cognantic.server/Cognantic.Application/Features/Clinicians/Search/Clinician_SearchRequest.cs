using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.Search;

public class Clinician_SearchRequest : IRequest<Result<List<Clinician_SearchResponse>>>
{
    public string? Specialty { get; set; }
    public decimal? MaxHourlyRate { get; set; }
    public string? SearchTerm { get; set; } // For Name/Bio search
}